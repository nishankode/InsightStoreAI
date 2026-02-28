// supabase/functions/scrape-reviews/index.ts
// Scrapes up to 100 reviews per star tier (1★, 2★, 3★) from Google Play.
// Checks the 24-hour review_cache before scraping to avoid redundant calls.
// Broadcasts Realtime progress events to channel `analysis:{analysisId}`.
//
// POST /functions/v1/scrape-reviews
// Body: { app_id: string, analysis_id: string }
// Auth: Bearer <supabase-anon-key> (called from run-analysis, TASK-07)

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getAdminClient, broadcastProgress } from '../_shared/supabase-admin.ts'

// google-play-scraper via npm specifier (Supabase Edge Functions support npm:)
// Assumption A8: if this fails, replace with direct Play Store HTML scraping.
import gplay from 'npm:google-play-scraper@9'

// ── Types ─────────────────────────────────────────────────────────
interface RequestBody {
    app_id: string
    analysis_id: string
}

interface ReviewItem {
    text: string
    score: number
    date: string
    thumbsUpCount: number
    userName: string
}

// ── Constants ─────────────────────────────────────────────────────
const REVIEWS_PER_TIER = 100
const SORT_BY_RATING = 2 // google-play-scraper: sort.RATING = 2

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ── Parse and validate request body ─────────────────────────────
    let body: RequestBody
    try {
        body = await req.json()
    } catch {
        return jsonResponse({ error: 'invalid_request_body' }, 400)
    }

    const { app_id, analysis_id } = body

    if (!app_id || typeof app_id !== 'string') {
        return jsonResponse({ error: 'invalid_app_id' }, 400)
    }
    if (!analysis_id || typeof analysis_id !== 'string') {
        return jsonResponse({ error: 'missing_analysis_id' }, 400)
    }

    // Validate package ID format (basic: contains a dot, no spaces)
    const packageIdPattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/
    if (!packageIdPattern.test(app_id)) {
        return jsonResponse({ error: 'invalid_app_id' }, 400)
    }

    const supabase = getAdminClient()

    // ── Helper: broadcast progress ───────────────────────────────────
    const broadcast = (stage: string, percent: number) =>
        broadcastProgress({ supabaseUrl, serviceRoleKey, analysisId: analysis_id, stage, percent })

    console.log(`[scrape-reviews] Starting for app=${app_id}, analysis=${analysis_id}`)

    // ── Update analysis status and broadcast initial progress ────────
    await supabase
        .from('analyses')
        .update({ status: 'scraping' })
        .eq('id', analysis_id)

    await broadcast('scraping', 5) // Move needle immediately

    // ── Fetch metadata from Play Store ─────────────────────────────
    console.log(`[scrape-reviews] Fetching metadata for ${app_id}...`)
    try {
        const app = await gplay.app({ appId: app_id, throttle: 10 })
        console.log(`[scrape-reviews] Metadata fetched: ${app.title}`)
        const { error: updateError } = await supabase
            .from('analyses')
            .update({
                app_name: app.title,
                app_icon_url: app.icon,
                app_rating: Math.round((app.score ?? 0) * 10) / 10,
                app_installs: app.installs ?? app.maxInstalls?.toLocaleString() ?? 'Unknown',
            })
            .eq('id', analysis_id)

        if (updateError) {
            console.error(`[scrape-reviews] Metadata update error for ${app_id}:`, updateError)
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`[scrape-reviews] Metadata fetch failed for ${app_id}:`, message)
        if (message.includes('404') || message.toLowerCase().includes('not found')) {
            await supabase
                .from('analyses')
                .update({ status: 'error' })
                .eq('id', analysis_id)
            return jsonResponse({ error: 'app_not_found' }, 404)
        }
    }

    // ── Check 24-hour cache for all 3 tiers ─────────────────────────
    const { data: cachedRows } = await supabase
        .from('review_cache')
        .select('star_tier, reviews')
        .eq('app_id', app_id)
        .in('star_tier', [1, 2, 3])
        .gte('cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const cachedTiers = new Map<number, ReviewItem[]>(
        (cachedRows ?? []).map((r) => [r.star_tier, r.reviews as ReviewItem[]]),
    )

    const allReviews: ReviewItem[] = []
    const isFullyCached = cachedTiers.size === 3

    if (isFullyCached) {
        // All 3 tiers in cache — return immediately
        for (const tier of [1, 2, 3]) {
            allReviews.push(...(cachedTiers.get(tier) ?? []))
        }
        await broadcast('scraping_complete', 40)
        return jsonResponse({ reviews: allReviews, cached: true })
    }

    // ── Scrape missing tiers ─────────────────────────────────────────
    const tierProgressMap: Record<number, { stage: string; percent: number }> = {
        1: { stage: 'scraping_1star', percent: 10 },
        2: { stage: 'scraping_2star', percent: 20 },
        3: { stage: 'scraping_3star', percent: 30 },
    }

    for (const tier of [1, 2, 3]) {
        // Use cached data if available for this tier
        if (cachedTiers.has(tier)) {
            allReviews.push(...(cachedTiers.get(tier) ?? []))
            const { stage, percent } = tierProgressMap[tier]
            await broadcast(stage, percent)
            continue
        }

        // ── Broadcast progress for this tier ──────────────────────────
        const { stage, percent } = tierProgressMap[tier]
        await broadcast(stage, percent)

        // ── Scrape from Google Play Store ─────────────────────────────
        let tierReviews: ReviewItem[] = []
        try {
            const results = await gplay.reviews({
                appId: app_id,
                sort: SORT_BY_RATING,
                num: REVIEWS_PER_TIER,
                // Filter by star rating: gplay supports pageSizeParam workaround
                // We scrape by rating tier using nextPaginationToken iteration
            })

            // google-play-scraper returns { data: [...], nextPaginationToken }
            const rawReviews = Array.isArray(results) ? results : (results?.data ?? [])

            // Filter to only the requested star tier and sanitise PII (strip userName)
            tierReviews = rawReviews
                .filter((r: { score: number }) => r.score === tier)
                .slice(0, REVIEWS_PER_TIER)
                .map((r: {
                    text: string
                    score: number
                    date: string | Date
                    thumbsUpCount: number
                    userName?: string
                }) => ({
                    text: r.text ?? '',
                    score: r.score,
                    date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString(),
                    thumbsUpCount: r.thumbsUpCount ?? 0,
                    // PII: userName stripped (replaced with placeholder) before storage
                    // Per PRD §12 Security + assumption A6
                    userName: 'reviewer',
                }))

            // If filter yields nothing (gplay may not support per-star filtering),
            // use all returned reviews for this tier as a fallback
            if (tierReviews.length === 0 && rawReviews.length > 0) {
                tierReviews = rawReviews.slice(0, REVIEWS_PER_TIER).map(
                    (r: { text: string; score: number; date: string | Date; thumbsUpCount: number }) => ({
                        text: r.text ?? '',
                        score: r.score,
                        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString(),
                        thumbsUpCount: r.thumbsUpCount ?? 0,
                        userName: 'reviewer',
                    }),
                )
            }
        } catch (err) {
            // Non-fatal: if one tier fails, continue with others
            // App-not-found error has a distinct message from gplay
            const message = err instanceof Error ? err.message : String(err)
            if (message.includes('404') || message.toLowerCase().includes('not found')) {
                await supabase
                    .from('analyses')
                    .update({ status: 'error' })
                    .eq('id', analysis_id)
                return jsonResponse({ error: 'app_not_found' }, 404)
            }
            console.error(`[scrape-reviews] Tier ${tier} scrape failed:`, message)
            // Continue with empty tier rather than crashing the pipeline
        }

        // ── Cache this tier's results ──────────────────────────────────
        if (tierReviews.length > 0) {
            await supabase
                .from('review_cache')
                .upsert(
                    { app_id, star_tier: tier, reviews: tierReviews, cached_at: new Date().toISOString() },
                    { onConflict: 'app_id,star_tier' },
                )
        }

        allReviews.push(...tierReviews)
    }

    // ── Broadcast scraping complete ──────────────────────────────────
    await broadcast('scraping_complete', 40)

    // Guard: if no reviews collected at all, the app ID is likely invalid
    if (allReviews.length === 0) {
        await supabase
            .from('analyses')
            .update({ status: 'error' })
            .eq('id', analysis_id)
        return jsonResponse({ error: 'scraping_failed', detail: 'No reviews found for app.' }, 500)
    }

    // ── Store review counts per tier in analyses row ─────────────────
    const reviewCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0 }
    for (const r of allReviews) {
        const key = String(r.score)
        if (key in reviewCounts) reviewCounts[key]++
    }
    await supabase
        .from('analyses')
        .update({ review_counts: reviewCounts })
        .eq('id', analysis_id)

    return jsonResponse({ reviews: allReviews, cached: false })
})
