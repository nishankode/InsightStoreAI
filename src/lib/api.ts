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
): Promise<T> {
    const { data, error } = await supabase.functions.invoke(name, {
        body,
    })

    if (error) {
        // FunctionsHttpError contains the error from the function response body if any
        let message = error.message

        // If it's an HTTP error, try to parse the body for a more specific message
        if ('context' in error && error.context instanceof Response) {
            try {
                const body = await (error.context as Response).clone().json()
                message = body.error || body.message || message
            } catch {
                // Not JSON, stay with original error.message
            }
        }

        console.error(`[invokeEdgeFunction] ${name} failed:`, message)
        throw new Error(message)
    }

    // Check if the response body itself contains an error field (Edge Function custom pattern)
    if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error((data as ApiError).error)
    }

    return data as T
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
): Promise<{ analysis_id: string; status: string }> {
    return invokeEdgeFunction('run-analysis', { app_id: appId })
}
