// supabase/functions/analyse-reviews/index.ts
// Sends scraped reviews to Gemini 2.5 Flash Lite, extracts structured pain points,
// and persists them to the pain_points table.
// Accepts app_context from run-analysis to enrich the Gemini prompt (PRD F-03.1, F-03.6).
// Stores version_tag per pain point row (PRD F-03.5).
//
// POST /functions/v1/analyse-reviews
// Body: { analysis_id: string, reviews: ReviewItem[], app_context?: AppContext }
// Auth: Bearer <service-role-key> (called from run-analysis)

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getAdminClient, broadcastProgress, isServiceRoleRequest } from '../_shared/supabase-admin.ts'
import {
    analyseReviewsWithGemini,
    type PainPoint,
    type ReviewItemForGemini,
    type AppContext,
} from '../_shared/gemini.ts'

// ── Types ─────────────────────────────────────────────────────────

// Full review shape as received from scrape-reviews (superset of ReviewItemForGemini)
interface ReviewItem {
    text: string
    score: number
    date: string
    thumbsUpCount: number
    userName: string
    replyText: string | null
    replyDate: string | null
    version: string | null
}

interface RequestBody {
    analysis_id: string
    reviews: ReviewItem[]
    app_context?: AppContext
}

// ── Validation sets ───────────────────────────────────────────────
const VALID_CATEGORIES = [
    'Bug',
    'UX Issue',
    'Performance',
    'Feature Gap',
    'Privacy',
    'Support',
    'Monetization Friction',   // PRD F-03: 7th category
] as const

const VALID_SEVERITIES = ['High', 'Medium', 'Low'] as const
const VALID_PHASES = ['Quick Win', 'Short-Term', 'Long-Term'] as const
const VALID_EFFORT_IMPACT = ['Low', 'Medium', 'High'] as const

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    // ── Internal Auth Check ──────────────────────────────────────────
    if (!isServiceRoleRequest(req)) {
        console.error('[analyse-reviews] Rejected unauthorized request (no service role)')
        return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
        console.error('[analyse-reviews] GEMINI_API_KEY secret not set.')
        return jsonResponse({ error: 'gemini_not_configured' }, 500)
    }

    // ── Parse and validate request ───────────────────────────────────
    let body: RequestBody
    try {
        body = await req.json()
    } catch {
        return jsonResponse({ error: 'invalid_request_body' }, 400)
    }

    const { analysis_id, reviews, app_context } = body

    if (!analysis_id || typeof analysis_id !== 'string') {
        return jsonResponse({ error: 'invalid_analysis_id' }, 400)
    }
    if (!Array.isArray(reviews) || reviews.length === 0) {
        return jsonResponse({ error: 'no_reviews_provided' }, 400)
    }

    const supabase = getAdminClient()

    // ── Helper: broadcast progress ───────────────────────────────────
    const broadcast = (stage: string, percent: number) =>
        broadcastProgress({ supabaseUrl, serviceRoleKey, analysisId: analysis_id, stage, percent })

    // ── Update status to analysing ───────────────────────────────────
    await supabase
        .from('analyses')
        .update({ status: 'analysing' })
        .eq('id', analysis_id)

    await broadcast('ai_analysis_start', 50)

    // ── Map reviews to the shape Gemini expects ──────────────────────
    // Include thumbsUpCount, replyText, version for richer prompt context
    const reviewsForGemini: ReviewItemForGemini[] = reviews.map((r) => ({
        text: r.text,
        score: r.score,
        thumbsUpCount: r.thumbsUpCount ?? 0,
        replyText: r.replyText ?? null,
        version: r.version ?? null,
    }))

    // ── Call Gemini 2.5 Flash Lite ───────────────────────────────────
    let result: { pain_points: PainPoint[] }
    try {
        result = await analyseReviewsWithGemini(reviewsForGemini, geminiApiKey, app_context)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[analyse-reviews] Gemini analysis failed:', message)
        await supabase
            .from('analyses')
            .update({ status: 'error' })
            .eq('id', analysis_id)
        return jsonResponse({ error: 'gemini_unavailable', detail: message }, 503)
    }

    await broadcast('ai_analysis_complete', 85)

    // ── Validate pain points structure ───────────────────────────────
    const validPainPoints = result.pain_points.filter((pp) =>
        (VALID_CATEGORIES as readonly string[]).includes(pp.category) &&
        (VALID_SEVERITIES as readonly string[]).includes(pp.severity) &&
        typeof pp.frequency === 'number' &&
        typeof pp.description === 'string' &&
        Array.isArray(pp.representative_quotes) &&
        pp.improvement &&
        typeof pp.improvement.recommendation === 'string' &&
        (VALID_PHASES as readonly string[]).includes(pp.improvement.phase) &&
        (VALID_EFFORT_IMPACT as readonly string[]).includes(pp.improvement.effort) &&
        (VALID_EFFORT_IMPACT as readonly string[]).includes(pp.improvement.impact)
    )

    if (validPainPoints.length === 0) {
        console.error('[analyse-reviews] No valid pain points after validation.')
        await supabase
            .from('analyses')
            .update({ status: 'error' })
            .eq('id', analysis_id)
        return jsonResponse({ error: 'gemini_unavailable', detail: 'Invalid pain point structure.' }, 503)
    }

    await broadcast('saving_results', 95)

    // ── Insert pain points into Postgres ─────────────────────────────
    // version_tag stored per row — nullable (PRD F-03.5)
    const painPointRows = validPainPoints.map((pp) => ({
        analysis_id,
        category: pp.category,
        severity: pp.severity,
        frequency: pp.frequency,
        description: pp.description,
        representative_quotes: pp.representative_quotes.slice(0, 2),
        improvement: pp.improvement,
        version_tag: pp.version_tag && pp.version_tag !== 'null'
            ? pp.version_tag
            : null,
    }))

    const { error: insertError } = await supabase
        .from('pain_points')
        .insert(painPointRows)

    if (insertError) {
        console.error('[analyse-reviews] DB insert failed:', insertError.message)
        await supabase
            .from('analyses')
            .update({ status: 'error' })
            .eq('id', analysis_id)
        return jsonResponse({ error: 'db_insert_failed', detail: insertError.message }, 500)
    }

    // ── Mark analysis complete ───────────────────────────────────────
    await supabase
        .from('analyses')
        .update({ status: 'complete' })
        .eq('id', analysis_id)

    await broadcast('complete', 100)

    return jsonResponse({ pain_points: validPainPoints })
})
