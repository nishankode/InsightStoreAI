// supabase/functions/run-analysis/index.ts
// Orchestrator: creates analysis row, returns analysis_id IMMEDIATELY,
// then runs the full scrape→analyse pipeline in the background via EdgeRuntime.waitUntil().
// This fixes the client timeout issue — the HTTP round-trip is < 2 seconds.
//
// POST /functions/v1/run-analysis
// Auth: Bearer <user-jwt>
// Body: { app_id: string }

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getAdminClient, broadcastProgress } from '../_shared/supabase-admin.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FUNCTION_BASE_URL = Deno.env.get('SUPABASE_URL') + '/functions/v1'

// ── Sibling Edge Function caller (internal, uses service_role) ───
async function callFunction(name: string, body: unknown): Promise<Response> {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    return fetch(`${FUNCTION_BASE_URL}/${name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
        },
        body: JSON.stringify(body),
    })
}

// ── Background pipeline ──────────────────────────────────────────
// Runs AFTER the HTTP response is sent to the client.
async function runPipeline(
    analysisId: string,
    appId: string,
    userId: string,
    currentAnalysisCount: number,
) {
    const adminClient = getAdminClient()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const broadcastError = async () => {
        await broadcastProgress({ supabaseUrl, serviceRoleKey, analysisId, stage: 'error', percent: 100 })
    }

    try {
        // ── Step 1: Scrape reviews ─────────────────────────────────────
        const scrapeRes = await callFunction('scrape-reviews', {
            app_id: appId,
            analysis_id: analysisId,
        })

        if (!scrapeRes.ok) {
            const errText = await scrapeRes.text().catch(() => 'unreadable_body')
            await adminClient
                .from('analyses')
                .update({ status: 'error', app_name: `scrape-reviews failed (${scrapeRes.status}): ${errText}` })
                .eq('id', analysisId)
            await broadcastError()
            console.error('[run-analysis] scrape-reviews failed:', errText)
            return
        }

        const { reviews } = await scrapeRes.json()

        if (!reviews?.length) {
            await adminClient
                .from('analyses')
                .update({ status: 'error' })
                .eq('id', analysisId)
            await broadcastError()
            return
        }

        // ── Step 2: Analyse with Gemini ────────────────────────────────
        const analyseRes = await callFunction('analyse-reviews', {
            analysis_id: analysisId,
            reviews,
        })

        if (!analyseRes.ok) {
            const errText = await analyseRes.text().catch(() => 'unreadable_body')
            console.error('[run-analysis] analyse-reviews failed:', errText)
            await adminClient
                .from('analyses')
                .update({ status: 'error', app_name: `analyse-reviews failed (${analyseRes.status}): ${errText}` })
                .eq('id', analysisId)
            await broadcastError()
            return
        }

        // ── Step 3: Increment user analysis count ──────────────────────
        await adminClient
            .from('users')
            .update({ analysis_count: currentAnalysisCount + 1 })
            .eq('id', userId)

        console.log(`[run-analysis] Pipeline complete for analysis ${analysisId}`)
    } catch (err) {
        const msg = err instanceof Error ? err.stack || err.message : String(err)
        console.error('[run-analysis] Unexpected pipeline error:', msg)
        await getAdminClient()
            .from('analyses')
            .update({ status: 'error', app_name: `catch: ${msg}`.substring(0, 200) })
            .eq('id', analysisId)
        await broadcastError()
    }
}

// ── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // ── Authenticate user ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return jsonResponse({ error: 'unauthenticated' }, 401)
    }
    const userJwt = authHeader.replace('Bearer ', '')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userJwt}` } },
        auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
        return jsonResponse({ error: 'unauthenticated' }, 401)
    }

    // ── Parse body ───────────────────────────────────────────────────
    let body: { app_id?: string }
    try {
        body = await req.json()
    } catch {
        return jsonResponse({ error: 'invalid_request_body' }, 400)
    }

    const appId = body.app_id?.trim()
    if (!appId) return jsonResponse({ error: 'invalid_app_id' }, 400)

    const packageIdPattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/
    if (!packageIdPattern.test(appId)) {
        return jsonResponse({ error: 'invalid_app_id' }, 400)
    }

    const adminClient = getAdminClient()

    // ── Free-tier limit check ────────────────────────────────────────
    console.log(`[run-analysis] Initializing admin client for user ${user.id}`)
    const { data: userRow, error: userRowError } = await adminClient
        .from('users')
        .select('plan, analysis_count')
        .eq('id', user.id)
        .single()

    if (userRowError && userRowError.code !== 'PGRST116') { // PGRST116 = 0 rows (expected on fresh signups)
        console.error('[run-analysis] Select users error:', userRowError)
        return jsonResponse({ error: 'select_users_failed', detail: userRowError.message }, 500)
    }

    if (userRow?.plan === 'free') {
        const { count } = await adminClient
            .from('analyses')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if ((count ?? 0) >= 5) {
            return jsonResponse({ error: 'free_tier_limit_reached' }, 403)
        }
    }

    // ── Ensure public.users row exists ────────────────────────────────
    // Supabase Auth does NOT auto-create public.users rows on signup.
    // Without this, the analyses.user_id FK constraint will reject the insert.
    console.log(`[run-analysis] Upserting users row for id ${user.id}`)
    const { error: upsertError } = await adminClient
        .from('users')
        .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

    if (upsertError) {
        console.error('[run-analysis] Upsert user error:', upsertError)
        return jsonResponse({ error: 'upsert_user_failed', detail: upsertError.message }, 500)
    }

    // Re-fetch user row after upsert
    const { data: freshUserRow, error: freshRowError } = await adminClient
        .from('users')
        .select('plan, analysis_count')
        .eq('id', user.id)
        .single()

    if (freshRowError) {
        console.error('[run-analysis] Fresh select error:', freshRowError)
        return jsonResponse({ error: 'fresh_select_failed', detail: freshRowError.message }, 500)
    }

    const effectiveUserRow = freshUserRow ?? userRow

    console.log(`[run-analysis] Inserting analyses row for app ${appId}`)
    const { data: analysis, error: createError } = await adminClient
        .from('analyses')
        .insert({
            user_id: user.id,
            app_id: appId,
            status: 'pending',
        })
        .select('id')
        .single()

    if (createError || !analysis) {
        console.error('[run-analysis] Create analysis error:', createError)
        if (createError?.code === '42501') {
            return jsonResponse({ error: 'free_tier_limit_reached' }, 403)
        }
        return jsonResponse({ error: 'analysis_create_failed', detail: createError?.message }, 500)
    }

    const analysisId = analysis.id

    // ── Return analysis_id IMMEDIATELY ──────────────────────────────
    // The pipeline runs in the background via EdgeRuntime.waitUntil().
    // The client subscribes to Realtime events for progress.
    const pipelinePromise = runPipeline(
        analysisId,
        appId,
        user.id,
        effectiveUserRow?.analysis_count ?? 0,
    )

    // EdgeRuntime.waitUntil keeps the function alive after the response is sent
    // @ts-ignore — EdgeRuntime is a Supabase-specific runtime global
    if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(pipelinePromise)
    }
    // (In local dev without EdgeRuntime, the pipeline runs synchronously after this point
    //  — this is fine for testing; production uses waitUntil)

    return jsonResponse({ analysis_id: analysisId, status: 'started' })
})
