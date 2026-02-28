// src/hooks/useAnalysis.ts
// TanStack Query hook: fetches analysis row + pain points from Supabase.
// Used by ReportPage, AppMetaCard, StarHistogram, and PainPointCards.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { AnalysisRow, PainPointRow } from '@/lib/supabaseClient'

// ── Fetch analysis row ────────────────────────────────────────────
async function fetchAnalysis(analysisId: string): Promise<AnalysisRow> {
    const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Analysis not found')
    return data
}

// ── Fetch pain points for an analysis ────────────────────────────
async function fetchPainPoints(analysisId: string): Promise<PainPointRow[]> {
    const { data, error } = await supabase
        .from('pain_points')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('severity', { ascending: true })   // High < Low alphabetically, handled in UI
        .order('frequency', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
}

// ── Hooks ─────────────────────────────────────────────────────────

/** Fetch a single analysis row. Refetches every 5s if not yet complete. */
export function useAnalysis(analysisId: string) {
    return useQuery({
        queryKey: ['analysis', analysisId],
        queryFn: () => fetchAnalysis(analysisId),
        refetchInterval: (query) => {
            const status = query.state.data?.status
            // Poll while not in a terminal state
            return status === 'complete' || status === 'error' ? false : 5000
        },
        staleTime: 0,
    })
}

/** Fetch all pain points for an analysis. Only runs when analysis is complete. */
export function usePainPoints(analysisId: string, enabled = true) {
    return useQuery({
        queryKey: ['pain_points', analysisId],
        queryFn: () => fetchPainPoints(analysisId),
        enabled,
        staleTime: 1000 * 60 * 10, // pain points don't change after analysis completes
    })
}

// ── Star distribution helper ──────────────────────────────────────
export interface StarDistribution {
    star: 1 | 2 | 3
    count: number
    percent: number
}

export function buildStarDistribution(
    reviewCounts: Record<string, number>,
): StarDistribution[] {
    const counts = [1, 2, 3].map((star) => ({
        star: star as 1 | 2 | 3,
        count: reviewCounts[String(star)] ?? 0,
    }))

    const total = counts.reduce((s, c) => s + c.count, 0)

    return counts.map(({ star, count }) => ({
        star,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
}
