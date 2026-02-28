// supabase/functions/_shared/supabase-admin.ts
// Creates a service-role Supabase client that bypasses RLS.
// Used exclusively inside Edge Functions — never exposed to the browser.

import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Returns a Supabase admin client using the service role key.
 * This client has full DB access and bypasses all RLS policies.
 * Call once per request — do not cache across requests.
 */
export function getAdminClient() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.',
        )
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

/**
 * Broadcast a progress event to a Supabase Realtime channel
 * using the REST broadcast endpoint (more reliable from Edge Functions
 * than opening a WebSocket subscription).
 *
 * Channel name convention: `analysis:{analysisId}`
 */
export async function broadcastProgress(params: {
    supabaseUrl: string
    serviceRoleKey: string
    analysisId: string
    stage: string
    percent: number
}) {
    const { supabaseUrl, serviceRoleKey, analysisId, stage, percent } = params

    const url = `${supabaseUrl}/realtime/v1/api/broadcast`

    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
        },
        body: JSON.stringify({
            messages: [
                {
                    topic: `analysis:${analysisId}`,
                    event: 'progress',
                    payload: { stage, percent },
                },
            ],
        }),
    }).catch(() => {
        // Non-fatal: progress event loss is acceptable; don't crash the function
        console.warn(`[broadcast] Failed to send stage=${stage}`)
    })
}

/**
 * Checks if the request's Authorization header contains the valid service role key.
 * Used to protect internal-only Edge Functions that are deployed with --no-verify-jwt.
 */
export function isServiceRoleRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!authHeader || !serviceRoleKey) return false

    const token = authHeader.replace('Bearer ', '')
    return token === serviceRoleKey
}
