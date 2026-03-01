// src/hooks/useUserAnalyses.ts
// TanStack Query hook: fetches all analyses for the currently authenticated user.
// Used by DashboardPage to render the "My Reports" history grid.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { AnalysisRow } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

async function fetchUserAnalyses(userId: string): Promise<AnalysisRow[]> {
    const { data, error } = await supabase
        .from('analyses')
        .select('id, user_id, app_id, app_name, app_icon_url, app_rating, app_category, app_installs, status, review_counts, is_public, shared_token, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as AnalysisRow[]
}

/**
 * Fetch all past analyses for the logged-in user, newest first.
 * Returns an empty array (not an error) if the user has no analyses yet.
 */
export function useUserAnalyses() {
    const { user, isLoading: authLoading } = useAuth()

    return useQuery({
        queryKey: ['user_analyses', user?.id],
        queryFn: () => fetchUserAnalyses(user!.id),
        enabled: !!user && !authLoading,
        staleTime: 1000 * 30, // 30s — dashboard should feel fairly live
    })
}
