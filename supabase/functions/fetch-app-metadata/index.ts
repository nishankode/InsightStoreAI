// supabase/functions/fetch-app-metadata/index.ts
// Accepts a Play Store URL or bare package ID, calls google-play-scraper,
// and returns structured app metadata for the search preview card (TASK-10).
// No authentication required — accessible to anonymous users.
//
// POST /functions/v1/fetch-app-metadata
// Body: { query: string }

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import gplay from 'npm:google-play-scraper@9'

// ── Package ID extractor ──────────────────────────────────────────
function extractPackageId(query: string): string | null {
    const trimmed = query.trim()

    // Full Play Store URL: https://play.google.com/store/apps/details?id=com.example.app
    try {
        const url = new URL(trimmed)
        if (
            url.hostname === 'play.google.com' &&
            url.pathname.includes('/apps/details')
        ) {
            const id = url.searchParams.get('id')
            if (id) return id
        }
    } catch {
        // Not a URL — fall through to package ID check
    }

    // Bare package ID: com.example.app
    const packageIdPattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/
    if (packageIdPattern.test(trimmed)) {
        return trimmed
    }

    return null
}

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    // ── Parse body ───────────────────────────────────────────────────
    let body: { query?: string }
    try {
        body = await req.json()
    } catch {
        return jsonResponse({ error: 'invalid_request_body' }, 400)
    }

    const query = body.query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return jsonResponse({ error: 'invalid_input' }, 400)
    }

    // ── Extract package ID ───────────────────────────────────────────
    const packageId = extractPackageId(query)
    if (!packageId) {
        return jsonResponse({ error: 'invalid_input' }, 400)
    }

    // ── Fetch app metadata from Google Play ──────────────────────────
    try {
        const app = await gplay.app({ appId: packageId, throttle: 10 })

        return jsonResponse({
            app_id: app.appId,
            name: app.title,
            icon: app.icon,
            developer: app.developer,
            rating: Math.round((app.score ?? 0) * 10) / 10,  // 1dp
            installs: app.installs ?? app.maxInstalls?.toLocaleString() ?? 'Unknown',
            category: app.genre ?? app.genreId ?? 'Unknown',
            last_updated: app.updated
                ? new Date(app.updated).toISOString().split('T')[0]
                : null,
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)

        // google-play-scraper throws a 404-like error for unknown apps
        if (
            message.includes('404') ||
            message.toLowerCase().includes('not found') ||
            message.toLowerCase().includes('does not exist')
        ) {
            return jsonResponse({ error: 'app_not_found' }, 404)
        }

        console.error('[fetch-app-metadata] Unexpected error:', message)
        return jsonResponse({ error: 'fetch_failed', detail: message }, 500)
    }
})
