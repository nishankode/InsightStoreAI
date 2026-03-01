// supabase/functions/scrape-reviews/index.ts
// Scrapes up to 100 reviews per star tier (1★, 2★, 3★) from Google Play.
// Checks the 24-hour review_cache before scraping to avoid redundant calls.
// Broadcasts Realtime progress events to channel `analysis:{analysisId}`.
// Captures replyText, replyDate, version per review (PRD F-02).
// Computes dev_response_rate and avg_reply_time_days (PRD F-05).
//
// POST /functions/v1/scrape-reviews
// Body: { app_id: string, analysis_id: string }
// Auth: Bearer <service-role-key> (called from run-analysis)

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getAdminClient, broadcastProgress, isServiceRoleRequest } from '../_shared/supabase-admin.ts'

// google-play-scraper via npm specifier (Supabase Edge Functions support npm:)
import gplay from 'npm:google-play-scraper@9'

// ── Types ─────────────────────────────────────────────────────────
interface RequestBody {
    app_id: string
    analysis_id: string
}

// Full review item including developer reply fields and app version
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

// ── Constants ─────────────────────────────────────────────────────
const REVIEWS_PER_TIER = 1000
const SORT_BY_RATING = 2 // google-play-scraper: sort.RATING = 2

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    // ── Internal Auth Check ──────────────────────────────────────────
    // This function is internal-only and relies on the service role key.
    if (!isServiceRoleRequest(req)) {
        console.error('[scrape-reviews] Rejected unauthorized request (no service role)')
        return jsonResponse({ error: 'unauthorized' }, 401)
    }

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

    await broadcast('scraping', 5)

    // ── Fetch metadata from Play Store ─────────────────────────────
    // Capture all PRD F-02 app metadata fields
    console.log(`[scrape-reviews] Fetching metadata for ${app_id}...`)
    try {
        const app = await gplay.app({ appId: app_id, country: 'us', lang: 'en', throttle: 10 })
        console.log(`[scrape-reviews] Metadata fetched: ${app.title}`)

        const { error: updateError } = await supabase
            .from('analyses')
            .update({
                app_name: app.title,
                app_icon_url: app.icon,
                app_rating: Math.round((app.score ?? 0) * 10) / 10,
                app_installs: app.installs ?? app.maxInstalls?.toLocaleString() ?? 'Unknown',
                app_category: app.genre ?? app.genreId ?? null,
                // ── New F-02 fields ──────────────────────────────
                app_version: app.version ?? null,
                contains_iap: app.containsIAP ?? false,
                ad_supported: app.adSupported ?? false,
                total_ratings: app.ratings ?? null,
                total_reviews: app.reviews ?? null,
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
        // Non-fatal: continue without metadata
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
        for (const tier of [1, 2, 3]) {
            allReviews.push(...(cachedTiers.get(tier) ?? []))
        }
        await broadcast('scraping_complete', 40)

        // Compute and store dev responsiveness even from cached reviews
        await storeDevResponsiveness(supabase, analysis_id, allReviews)

        return jsonResponse({ reviews: allReviews, cached: true })
    }

    // ── Scrape remaining tiers ────────────────────────────────────────
    // Since google-play-scraper just fetches the top N reviews overall,
    // we fetch a massive batch once and locally sort into exact 100-item buckets.

    if (!isFullyCached) {
        await broadcast('scraping_api', 20)

        try {
            // Sort by Rating in google-play-scraper doesn't guarantee distribution.
            // Default 1 = HELPFULNESS, 2 = NEWEST, 3 = RATING in standard versions.
            // Scrape a massive batch of the newest reviews (sort: 2 = NEWEST)
            const results = await gplay.reviews({
                appId: app_id,
                sort: 2,
                num: 10000, // Fetch up to 10,000 to ensure we can hit the 1000-per-tier bucket limits
                lang: 'en',
                country: 'us'
            })

            const rawReviews = Array.isArray(results) ? results : (results?.data ?? [])

            // Map raw reviews to ReviewItem — capture all PRD F-02 fields
            const mapReview = (r: {
                text: string
                score: number
                date: string | Date
                thumbsUpCount: number
                userName?: string
                replyText?: string | null
                replyDate?: string | Date | null
                // deno-lint-ignore no-explicit-any
                version?: any
            }): ReviewItem => ({
                text: r.text ?? '',
                score: r.score,
                date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString(),
                thumbsUpCount: r.thumbsUpCount ?? 0,
                userName: 'reviewer',
                replyText: r.replyText ?? null,
                replyDate: r.replyDate
                    ? (typeof r.replyDate === 'string' ? r.replyDate : new Date(r.replyDate).toISOString())
                    : null,
                version: r.version ? String(r.version) : null,
            })

            // deno-lint-ignore no-explicit-any
            const mappedReviews = rawReviews.map((r: any) => mapReview(r))

            // Sort them into buckets
            const buckets: Record<1 | 2 | 3, ReviewItem[]> = { 1: [], 2: [], 3: [] }

            for (const review of mappedReviews) {
                const s = review.score
                if ((s === 1 || s === 2 || s === 3) && buckets[s].length < REVIEWS_PER_TIER) {
                    buckets[s].push(review)
                }
            }

            // Cache missing tiers exactly as provided by user
            for (const tier of [1, 2, 3] as const) {
                const tierReviews = buckets[tier]

                if (tierReviews.length > 0) {
                    await supabase
                        .from('review_cache')
                        .upsert(
                            {
                                app_id,
                                star_tier: tier,
                                reviews: tierReviews,
                                cached_at: new Date().toISOString(),
                            },
                            { onConflict: 'app_id,star_tier' },
                        )
                }

                // Add to our final array if it wasn't already loaded from cache earlier
                if (!cachedTiers.has(tier)) {
                    allReviews.push(...tierReviews)
                }
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            if (message.includes('404') || message.toLowerCase().includes('not found')) {
                await supabase
                    .from('analyses')
                    .update({ status: 'error' })
                    .eq('id', analysis_id)
                return jsonResponse({ error: 'app_not_found' }, 404)
            }
            console.error(`[scrape-reviews] Massive scrape failed:`, message)
        }
    }

    await broadcast('scraping_complete', 40)

    if (allReviews.length === 0) {
        await supabase
            .from('analyses')
            .update({ status: 'error' })
            .eq('id', analysis_id)
        return jsonResponse({ error: 'scraping_failed', detail: 'No reviews found for app.' }, 500)
    }

    // ── Store review counts per tier ─────────────────────────────────
    const reviewCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0 }
    for (const r of allReviews) {
        const key = String(r.score)
        if (key in reviewCounts) reviewCounts[key]++
    }
    await supabase
        .from('analyses')
        .update({ review_counts: reviewCounts })
        .eq('id', analysis_id)

    // ── Compute and store dev responsiveness metrics ─────────────────
    await storeDevResponsiveness(supabase, analysis_id, allReviews)

    return jsonResponse({ reviews: allReviews, cached: false })
})

// ── Helper: compute and store dev responsiveness ──────────────────
// PRD F-02: dev_response_rate + avg_reply_time_days
async function storeDevResponsiveness(
    // deno-lint-ignore no-explicit-any
    supabase: any,
    analysisId: string,
    reviews: ReviewItem[],
): Promise<void> {
    if (reviews.length === 0) return

    const reviewsWithReply = reviews.filter((r) => r.replyText && r.replyDate)
    const devResponseRate = (reviewsWithReply.length / reviews.length) * 100

    let avgReplyTimeDays = 0
    if (reviewsWithReply.length > 0) {
        const totalDays = reviewsWithReply.reduce((sum, r) => {
            const reviewDate = new Date(r.date).getTime()
            const replyDate = new Date(r.replyDate!).getTime()
            const diffDays = (replyDate - reviewDate) / 86_400_000
            // Only count positive diffs (replyDate after reviewDate)
            return sum + Math.max(0, diffDays)
        }, 0)
        avgReplyTimeDays = totalDays / reviewsWithReply.length
    }

    const { error } = await supabase
        .from('analyses')
        .update({
            dev_response_rate: Math.round(devResponseRate * 10) / 10,
            avg_reply_time_days: Math.round(avgReplyTimeDays * 10) / 10,
        })
        .eq('id', analysisId)

    if (error) {
        console.warn('[scrape-reviews] Dev responsiveness update failed:', error.message)
    } else {
        console.log(`[scrape-reviews] Dev responsiveness: ${devResponseRate.toFixed(1)}% (avg ${avgReplyTimeDays.toFixed(1)} days)`)
    }
}
