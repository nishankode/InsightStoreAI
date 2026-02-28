// supabase/functions/_shared/gemini.ts
// Gemini 2.0 Flash REST client with 3x exponential backoff retry.
// Called from analyse-reviews Edge Function.

// PRD Section 10.2 — Pain Point JSON schema types
export interface ImprovementPlan {
    recommendation: string
    phase: 'Quick Win' | 'Short-Term' | 'Long-Term'
    effort: 'Low' | 'Medium' | 'High'
    impact: 'Low' | 'Medium' | 'High'
}

export interface PainPoint {
    category: 'Bug' | 'UX Issue' | 'Performance' | 'Feature Gap' | 'Privacy' | 'Support'
    severity: 'High' | 'Medium' | 'Low'
    frequency: number
    description: string
    representative_quotes: string[]
    improvement: ImprovementPlan
}

export interface GeminiAnalysisResult {
    pain_points: PainPoint[]
}

const GEMINI_API_BASE =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// ── Prompt ────────────────────────────────────────────────────────
function buildPrompt(reviewsJson: string): string {
    return `You are a senior product analyst. Analyse the following Google Play Store reviews and extract ALL recurring pain points that users experience.

IMPORTANT RULES:
- Return ONLY valid JSON matching the schema below — no markdown, no explanation, no code blocks.
- "frequency" is the count of reviews mentioning this specific issue.
- "representative_quotes" must be verbatim text from the provided reviews (max 2 quotes per pain point).
- Every pain point must have a complete "improvement" object.
- Do not invent issues not present in the reviews.
- Group related complaints into one pain point rather than creating duplicates.

REQUIRED JSON SCHEMA:
{
  "pain_points": [
    {
      "category": "Bug | UX Issue | Performance | Feature Gap | Privacy | Support",
      "severity": "High | Medium | Low",
      "frequency": <integer>,
      "description": "<root cause explanation — why users are frustrated, not just what they complain about>",
      "representative_quotes": ["<verbatim quote from review>", "<second verbatim quote>"],
      "improvement": {
        "recommendation": "<specific, actionable improvement — concrete engineering or design action>",
        "phase": "Quick Win | Short-Term | Long-Term",
        "effort": "Low | Medium | High",
        "impact": "Low | Medium | High"
      }
    }
  ]
}

SEVERITY GUIDE:
- High: Mentioned in >15% of reviews OR causes crashes/data loss/inability to use the app
- Medium: Mentioned in 5–15% of reviews OR significantly degrades the experience
- Low: Mentioned in <5% of reviews OR minor inconvenience

PHASE GUIDE:
- Quick Win: Can be resolved in 0–4 weeks (config change, copy fix, simple UI tweak)
- Short-Term: Requires 1–3 months of engineering work
- Long-Term: Requires 3–6 months or architectural changes

USER REVIEWS TO ANALYSE:
${reviewsJson}`
}

// ── JSON extraction from Gemini response ─────────────────────────
function extractJson(text: string): GeminiAnalysisResult {
    // Gemini sometimes wraps JSON in markdown code blocks — strip them
    const clean = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

    const parsed = JSON.parse(clean) as GeminiAnalysisResult

    if (!Array.isArray(parsed.pain_points)) {
        throw new Error('Gemini response missing pain_points array')
    }

    return parsed
}

// ── Main export: call Gemini (no retry) ──────────────────────────
export async function analyseReviewsWithGemini(
    reviews: Array<{ text: string; score: number }>,
    apiKey: string,
): Promise<GeminiAnalysisResult> {
    // Prepare review text — only include the review text and star rating
    const reviewsForPrompt = reviews
        .filter((r) => r.text && r.text.trim().length > 10)
        .map((r) => `[${r.score}★] ${r.text.trim().substring(0, 500)}`)

    if (reviewsForPrompt.length === 0) {
        throw new Error('No valid review text to analyse')
    }

    const reviewsJson = JSON.stringify(reviewsForPrompt)
    const prompt = buildPrompt(reviewsJson)

    console.log('[gemini] Initiating analysis hit...')

    const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 8192,
            },
        }),
    })

    if (!response.ok) {
        const errorBody = await response.text()
        if (response.status === 429) {
            console.error('[gemini] Rate limited (429).')
            throw new Error(`RateLimited`)
        }
        throw new Error(`Gemini API ${response.status}: ${errorBody}`)
    }

    const data = await response.json() as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> }
            finishReason?: string
        }>
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
        throw new Error('Gemini returned empty content')
    }

    return extractJson(rawText)
}

