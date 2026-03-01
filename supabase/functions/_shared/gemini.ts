// supabase/functions/_shared/gemini.ts
// Gemini 2.5 Flash Lite REST client.
// Called from analyse-reviews Edge Function.
// PRD F-03: 7 categories, full app metadata context, thumbsUpCount weighting,
//           replyText null elevation, version correlation, version_tag output.

// ── Types ─────────────────────────────────────────────────────────

export interface ImprovementPlan {
    recommendation: string
    phase: 'Quick Win' | 'Short-Term' | 'Long-Term'
    effort: 'Low' | 'Medium' | 'High'
    impact: 'Low' | 'Medium' | 'High'
}

export interface PainPoint {
    category:
    | 'Bug'
    | 'UX Issue'
    | 'Performance'
    | 'Feature Gap'
    | 'Privacy'
    | 'Support'
    | 'Monetization Friction'
    severity: 'High' | 'Medium' | 'Low'
    frequency: number
    description: string
    representative_quotes: string[]
    improvement: ImprovementPlan
    version_tag?: string
}

export interface GeminiAnalysisResult {
    pain_points: PainPoint[]
}

// Review shape sent to Gemini (richer than the DB-stored shape)
export interface ReviewItemForGemini {
    text: string
    score: number
    thumbsUpCount: number
    replyText: string | null
    version: string | null
}

// Optional app context to enrich the Gemini prompt
export interface AppContext {
    appVersion: string | null
    containsIAP: boolean
    adSupported: boolean
    appRating: number | null
    appCategory: string | null
}

// ── Constants ─────────────────────────────────────────────────────
const GEMINI_API_BASE =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// ── Prompt builder ────────────────────────────────────────────────
function buildPrompt(reviewsJson: string, appContext?: AppContext): string {
    const contextBlock = appContext
        ? `
APP CONTEXT (use this to enrich your analysis):
- App version: ${appContext.appVersion ?? 'unknown'}
- Category: ${appContext.appCategory ?? 'unknown'}
- Store rating: ${appContext.appRating ?? 'unknown'}
- Contains in-app purchases (IAP): ${appContext.containsIAP}
- Ad-supported: ${appContext.adSupported}

If containsIAP or adSupported is true, look carefully for Monetization Friction pain points.
`
        : ''

    return `You are a senior product analyst. Analyse the following Google Play Store reviews and extract ALL recurring pain points that users experience.

IMPORTANT RULES:
- Return ONLY valid JSON matching the schema below — no markdown, no explanation, no code blocks.
- "frequency" is the count of reviews mentioning this specific issue.
- "representative_quotes" must be verbatim text from the provided reviews (max 2 quotes per pain point).
- Every pain point must have a complete "improvement" object.
- Do not invent issues not present in the reviews.
- Group related complaints into one pain point rather than creating duplicates.
- "thumbsUp" in the review data represents how many users agreed with that review — give higher weight to high-thumbsUp reviews when scoring severity.
- "replyText: null" means the developer never responded to that complaint — elevate severity for pain points where most matching reviews have no developer reply.
- "version" is the app version the reviewer was using (may be null). You MUST determine the most common or most recent app version associated with this pain point and set it as the "version_tag". Do not leave it null.
${contextBlock}
REQUIRED JSON SCHEMA:
{
  "pain_points": [
    {
      "category": "Bug | UX Issue | Performance | Feature Gap | Privacy | Support | Monetization Friction",
      "severity": "High | Medium | Low",
      "frequency": <integer>,
      "description": "<root cause explanation — why users are frustrated, not just what they complain about>",
      "representative_quotes": ["<verbatim quote from review>", "<second verbatim quote>"],
      "version_tag": "<the most prominent app version string associated with this issue>",
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
- High: Mentioned in >15% of reviews OR causes crashes/data loss/inability to use the app OR has high thumbsUp counts OR developer never replied to these complaints (replyText: null across matching reviews)
- Medium: Mentioned in 5–15% of reviews OR significantly degrades the experience OR moderate thumbsUp counts
- Low: Mentioned in <5% of reviews OR minor inconvenience OR low thumbsUp counts

PHASE GUIDE:
- Quick Win: Can be resolved in 0–4 weeks (config change, copy fix, simple UI tweak)
- Short-Term: Requires 1–3 months of engineering work
- Long-Term: Requires 3–6 months or architectural changes

MONETIZATION FRICTION:
- Use this category when users complain about pricing, paywalls, forced purchases, aggressive ads,
  or value-for-money. Only relevant if containsIAP or adSupported is true.

USER REVIEWS TO ANALYSE (format: [score★] thumbsUp:<n> version:<v> reply:<yes|no> — <review text>):
${reviewsJson}`
}

// ── JSON extraction from Gemini response ─────────────────────────
function extractJson(text: string): GeminiAnalysisResult {
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

// ── Main export: call Gemini ──────────────────────────────────────
export async function analyseReviewsWithGemini(
    reviews: ReviewItemForGemini[],
    apiKey: string,
    appContext?: AppContext,
): Promise<GeminiAnalysisResult> {
    // Format reviews with all relevant signal fields for Gemini
    const validReviews = reviews.filter((r) => r.text && r.text.trim().length > 10)

    if (validReviews.length === 0) {
        throw new Error('No valid review text to analyse')
    }

    const reviewsJson = JSON.stringify(
        validReviews.map((r) => ({
            score: r.score,
            thumbsUp: r.thumbsUpCount,
            version: r.version ?? null,
            hasDevReply: r.replyText !== null && r.replyText !== undefined,
            text: r.text.trim().substring(0, 500),
        }))
    )

    const prompt = buildPrompt(reviewsJson, appContext)

    console.log('[gemini] Initiating analysis...')

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
            throw new Error('RateLimited')
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
