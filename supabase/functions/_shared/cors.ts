// supabase/functions/_shared/cors.ts
// CORS headers shared across all Edge Functions.

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Return a 200 preflight response for OPTIONS requests. */
export function handleCors(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    return null
}

/** Wrap a JSON body with CORS headers. */
export function jsonResponse(
    body: unknown,
    status = 200,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
