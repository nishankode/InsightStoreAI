import { createClient } from '@supabase/supabase-js'

// ─── Environment Variable Validation ────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        '[InsightStore AI] Missing Supabase environment variables.\n' +
        'Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    )
}

// ─── Type Definitions ────────────────────────────────────────────────────────
// Mirrors the Supabase Postgres schema from TASK-03.
// Extend as new tables are added.
export type AnalysisStatus = 'pending' | 'scraping' | 'analysing' | 'complete' | 'error'
export type UserPlan = 'free' | 'builder' | 'pro' | 'agency'
export type Severity = 'High' | 'Medium' | 'Low'
export type Category = 'Bug' | 'UX Issue' | 'Performance' | 'Feature Gap' | 'Privacy' | 'Support'
export type Phase = 'Quick Win' | 'Short-Term' | 'Long-Term'
export type EffortImpact = 'Low' | 'Medium' | 'High'

export interface ImprovementPlan {
    recommendation: string
    phase: Phase
    effort: EffortImpact
    impact: EffortImpact
}

export interface PainPointRow {
    id: string
    analysis_id: string
    category: Category
    severity: Severity
    frequency: number
    description: string
    representative_quotes: string[]
    improvement: ImprovementPlan
    created_at: string
}

export interface AnalysisRow {
    id: string
    user_id: string | null
    app_id: string
    app_name: string | null
    app_icon_url: string | null
    app_rating: number | null
    app_installs: string | null
    status: AnalysisStatus
    shared_token: string | null
    created_at: string
}

export interface UserRow {
    id: string
    plan: UserPlan
    analysis_count: number
    created_at: string
}

export interface ReviewCacheRow {
    id: string
    app_id: string
    star_tier: 1 | 2 | 3
    reviews: ReviewItem[]
    cached_at: string
}

export interface ReviewItem {
    text: string
    score: number
    date: string
    thumbsUpCount: number
    userName: string
}

// ─── Database Type Map ───────────────────────────────────────────────────────
export interface Database {
    public: {
        Tables: {
            users: {
                Row: UserRow
                Insert: Partial<UserRow> & { id: string }
                Update: Partial<UserRow>
            }
            analyses: {
                Row: AnalysisRow
                Insert: Omit<AnalysisRow, 'id' | 'created_at' | 'shared_token'>
                Update: Partial<AnalysisRow>
            }
            pain_points: {
                Row: PainPointRow
                Insert: Omit<PainPointRow, 'id' | 'created_at'>
                Update: Partial<PainPointRow>
            }
            review_cache: {
                Row: ReviewCacheRow
                Insert: Omit<ReviewCacheRow, 'id' | 'cached_at'>
                Update: Partial<ReviewCacheRow>
            }
        }
    }
}

// ─── Typed Supabase Client ───────────────────────────────────────────────────
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,       // Session persists across page refreshes (localStorage)
        autoRefreshToken: true,     // Automatically refresh tokens before expiry
        detectSessionInUrl: true,   // Supports OAuth redirect flows
    },
    realtime: {
        params: {
            eventsPerSecond: 10,      // Throttle Realtime events — sufficient for progress updates
        },
    },
})

export default supabase
