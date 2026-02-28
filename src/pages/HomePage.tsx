// src/pages/HomePage.tsx
// F-01: Main landing page — search bar + app preview card.
// Replaced shell placeholder with real composition.

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '@/components/search/SearchBar'
import { AppPreviewCard } from '@/components/search/AppPreviewCard'
import { useMutation } from '@tanstack/react-query'
import { runAnalysis } from '@/lib/api'
import { supabase } from '@/lib/supabaseClient'
import type { AppMetadata } from '@/lib/api'

export default function HomePage() {
    const [appMetadata, setAppMetadata] = useState<AppMetadata | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const navigate = useNavigate()

    // ── Run analysis mutation ────────────────────────────────────────
    const { mutate: startAnalysis, isPending: isAnalysing } = useMutation({
        mutationFn: async (appId: string) => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            console.debug('[HomePage] getSession result:', {
                hasSession: !!session,
                sessionError,
                userId: session?.user?.id,
                email: session?.user?.email,
                emailConfirmedAt: session?.user?.email_confirmed_at,
                hasAccessToken: !!session?.access_token,
                tokenPreview: session?.access_token?.slice(0, 30),
            })
            if (!session?.access_token) {
                navigate(`/auth?redirect=/?app=${encodeURIComponent(appId)}`)
                throw new Error('unauthenticated')
            }
            return runAnalysis(appId, session.access_token)
        },
        onSuccess: ({ analysis_id }) => {
            setAnalysisError(null)
            navigate(`/analysis/${analysis_id}`)
        },

        onError: (err) => {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[HomePage] Analysis error:', msg)
            if (msg === 'unauthenticated') return // Already redirected
            if (msg.includes('free_tier_limit_reached')) {
                setAnalysisError('You have reached the 5-analysis limit on the free plan. Upgrade to continue.')
                return
            }
            // Show all other errors — previously these were silently swallowed
            setAnalysisError(`Analysis failed: ${msg}. Please try again.`)
        },
    })

    const handleResult = useCallback((metadata: AppMetadata) => {
        setAppMetadata(metadata)
    }, [])

    const handleClear = useCallback(() => {
        setAppMetadata(null)
    }, [])

    const handleAnalyse = useCallback(
        (appId: string) => {
            startAnalysis(appId)
        },
        [startAnalysis],
    )

    return (
        <div className="page-wrapper">
            {/* ── Hero section ──────────────────────────────────────────── */}
            <div className="flex flex-col items-center text-center py-20 gap-6">
                {/* Tag line */}
                <div className="badge-info text-xs px-3 py-1 rounded-full font-mono">
                    Gemini 2.0 Flash · Google Play Reviews
                </div>

                <h1 className="font-heading font-bold text-4xl sm:text-5xl text-text-primary tracking-heading max-w-2xl leading-tight">
                    Turn{' '}
                    <span className="text-brand-primary">1-star reviews</span>{' '}
                    into a product roadmap
                </h1>

                <p className="text-text-secondary text-base sm:text-lg max-w-xl leading-relaxed">
                    InsightStore AI analyses up to 300 Google Play reviews, extracts root-cause
                    pain points, and delivers prioritised improvement recommendations — in under 2 minutes.
                </p>

                {/* ── Search bar ──────────────────────────────────────────── */}
                <div className="w-full flex justify-center mt-2">
                    <SearchBar onResult={handleResult} onClear={handleClear} />
                </div>

                {/* ── App preview card ────────────────────────────────────── */}
                {appMetadata && (
                    <div className="w-full flex flex-col items-center gap-3 mt-4">
                        <AppPreviewCard
                            metadata={appMetadata}
                            onAnalyse={handleAnalyse}
                            isAnalysing={isAnalysing}
                        />
                        {/* Analysis error — shown when mutation fails */}
                        {analysisError && (
                            <p role="alert" className="text-severity-high text-sm flex items-center gap-2">
                                <span aria-hidden>⚠</span> {analysisError}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Feature highlights ────────────────────────────────────── */}
            {!appMetadata && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-20 max-w-2xl mx-auto">
                    {FEATURES.map((f) => (
                        <div key={f.title} className="card text-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center mx-auto text-lg">
                                {f.icon}
                            </div>
                            <h3 className="font-heading font-semibold text-sm text-text-primary">
                                {f.title}
                            </h3>
                            <p className="text-text-muted text-xs leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const FEATURES = [
    {
        icon: '🔍',
        title: '300 Reviews Analysed',
        desc: 'Scrapes the most recent 1★, 2★, and 3★ reviews to surface real user frustrations.',
    },
    {
        icon: '🧠',
        title: 'AI Root-Cause Analysis',
        desc: 'Gemini 2.0 Flash extracts structured pain points with severity, frequency, and category.',
    },
    {
        icon: '🗺️',
        title: 'Instant Roadmap',
        desc: 'Every pain point ships with a phase-classified improvement recommendation.',
    },
]
