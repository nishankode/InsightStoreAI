// supabase/functions/analyse-reviews/index.ts
// Sends scraped reviews to Gemini 2.0 Flash, extracts structured pain points,
// and persists them to the pain_points table.
//
// POST /functions/v1/analyse-reviews
// Body: { analysis_id: string, reviews: ReviewItem[] }
// Auth: Bearer <supabase-anon-key> (called from run-analysis, TASK-07)

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getAdminClient, broadcastProgress, isServiceRoleRequest } from '../_shared/supabase-admin.ts'
import { analyseReviewsWithGemini, type PainPoint } from '../_shared/gemini.ts'

// ── Types ─────────────────────────────────────────────────────────
interface ReviewItem {
    text: string
    score: number
    date: string
    thumbsUpCount: number
    userName: string
}

interface RequestBody {
    analysis_id: string
    reviews: ReviewItem[]
}

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    // ── Internal Auth Check ──────────────────────────────────────────
    // This function is internal-only and relies on the service role key.
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

    const { analysis_id, reviews } = body

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

    // ── Call Gemini 2.0 Flash ────────────────────────────────────────
    let result: { pain_points: PainPoint[] }
    try {
        result = await analyseReviewsWithGemini(reviews, geminiApiKey)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[analyse-reviews] Gemini analysis hit failed:', message)

        await supabase
            .from('analyses')
            .update({ status: 'error' })
            .eq('id', analysis_id)

        return jsonResponse({ error: 'gemini_unavailable', detail: message }, 503)
    }

    await broadcast('ai_analysis_complete', 85)

    // ── Validate pain points structure ───────────────────────────────
    const validCategories = ['Bug', 'UX Issue', 'Performance', 'Feature Gap', 'Privacy', 'Support']
    const validSeverities = ['High', 'Medium', 'Low']
    const validPhases = ['Quick Win', 'Short-Term', 'Long-Term']
    const validEffortImpact = ['Low', 'Medium', 'High']

    const validPainPoints = result.pain_points.filter((pp) => {
        return (
            validCategories.includes(pp.category) &&
            validSeverities.includes(pp.severity) &&
            typeof pp.frequency === 'number' &&
            typeof pp.description === 'string' &&
            Array.isArray(pp.representative_quotes) &&
            pp.improvement &&
            typeof pp.improvement.recommendation === 'string' &&
            validPhases.includes(pp.improvement.phase) &&
            validEffortImpact.includes(pp.improvement.effort) &&
            validEffortImpact.includes(pp.improvement.impact)
        )
    })

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
    // Using service_role client — bypasses RLS (pain_points has no client INSERT policy)
    const painPointRows = validPainPoints.map((pp) => ({
        analysis_id,
        category: pp.category,
        severity: pp.severity,
        frequency: pp.frequency,
        description: pp.description,
        representative_quotes: pp.representative_quotes.slice(0, 2), // enforce max 2 quotes
        improvement: pp.improvement,
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
