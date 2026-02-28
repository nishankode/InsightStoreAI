// src/lib/api.ts
// Typed wrappers for Supabase Edge Function calls.

import { supabase } from './supabaseClient'

// ── Types (mirroring Edge Function contracts) ────────────────────
export interface AppMetadata {
    app_id: string
    name: string
    icon: string
    developer: string
    rating: number
    installs: string
    category: string
    last_updated: string | null
}

export interface ApiError {
    error: string
    detail?: string
}

// ── Helper: invoke an Edge Function via raw fetch ────────────────
// Using raw fetch (instead of supabase.functions.invoke) so we can
// read the actual JSON error body from non-2xx responses.
async function invokeEdgeFunction<T>(
    name: string,
    body: Record<string, unknown>,
    userJwt?: string,
): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': userJwt
            ? `Bearer ${userJwt}`
            : session?.access_token
                ? `Bearer ${session.access_token}`
                : `Bearer ${supabaseAnonKey}`,
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })

    // Always try to parse the response body as JSON
    let json: unknown
    try {
        json = await res.json()
    } catch {
        // Non-JSON body (e.g. runtime crash before response)
        throw new Error(`[${name}] HTTP ${res.status}: ${res.statusText || 'Unknown error'}`)
    }

    if (!res.ok) {
        // Extract structured error from the function's JSON body
        const errObj = json as { error?: string; message?: string }
        const detail = errObj?.error ?? errObj?.message ?? `HTTP ${res.status}`
        throw new Error(detail)
    }

    // Also check if a 200 response still contains an error field (Edge Function pattern)
    if (typeof json === 'object' && json !== null && 'error' in json) {
        throw new Error((json as ApiError).error)
    }

    return json as T
}

// ── Public API functions ─────────────────────────────────────────

/**
 * Fetch app metadata from Google Play (no auth required).
 * Accepts a Play Store URL or bare package ID.
 */
export async function fetchAppMetadata(query: string): Promise<AppMetadata> {
    return invokeEdgeFunction<AppMetadata>('fetch-app-metadata', { query })
}

/**
 * Kick off a full analysis pipeline.
 * Requires an authenticated user session.
 */
export async function runAnalysis(
    appId: string,
    userJwt: string,
): Promise<{ analysis_id: string; status: string }> {
    return invokeEdgeFunction('run-analysis', { app_id: appId }, userJwt)
}
