// src/components/progress/AnalysisProgress.tsx
// TASK-11: Full-screen progress experience during analysis pipeline.
// Subscribes to Supabase Realtime channel `analysis:{analysisId}`,
// advances the progress bar, and auto-navigates to /report/:analysisId on complete.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'

// ── Stage → human-readable label map ────────────────────────────
const STAGE_LABELS: Record<string, string> = {
    pending: 'Initialising analysis…',
    scraping_1star: 'Fetching 1-star reviews…',
    scraping_2star: 'Fetching 2-star reviews…',
    scraping_3star: 'Fetching 3-star reviews…',
    scraping_complete: 'Reviews collected. Starting AI analysis…',
    ai_analysis_start: 'Gemini is reading the reviews…',
    ai_analysis_complete: 'Pain points extracted. Saving results…',
    saving_results: 'Writing to database…',
    complete: 'Analysis complete!',
    error: 'Something went wrong.',
}

const TIMEOUT_MS = 30_000  // 30 seconds with no event = warn user

interface AnalysisProgressProps {
    analysisId: string
    onRetry?: () => void
}

interface ProgressState {
    percent: number
    stage: string
    isError: boolean
    isComplete: boolean
    isTimedOut: boolean
}

export function AnalysisProgress({ analysisId, onRetry }: AnalysisProgressProps) {
    const navigate = useNavigate()

    const [state, setState] = useState<ProgressState>({
        percent: 0,
        stage: 'pending',
        isError: false,
        isComplete: false,
        isTimedOut: false,
    })

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Reset the 30-second inactivity timer on every event ─────────
    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            setState((prev) =>
                prev.isComplete || prev.isError ? prev : { ...prev, isTimedOut: true },
            )
        }, TIMEOUT_MS)
    }

    useEffect(() => {
        // Start the timeout immediately — if first event never comes, warn after 30s
        resetTimeout()

        // ── Subscribe to Realtime broadcast channel ──────────────────
        const channel = supabase
            .channel(`analysis:${analysisId}`)
            .on(
                'broadcast',
                { event: 'progress' },
                (msg: { payload?: { stage?: string; percent?: number } }) => {
                    const payload = msg.payload
                    if (!payload || !payload.stage) return

                    const stage = payload.stage
                    const percent = payload.percent ?? 0

                    resetTimeout()

                    setState((prev) => ({
                        ...prev,
                        percent: Math.max(prev.percent, percent), // never go backwards
                        stage,
                        isTimedOut: false,
                        isError: stage === 'error',
                        isComplete: stage === 'complete',
                    }))

                    if (stage === 'complete') {
                        // Brief delay so the user sees 100% before navigation
                        setTimeout(() => {
                            navigate(`/report/${analysisId}`, { replace: true })
                        }, 800)
                    }
                },
            )
            .subscribe()

        return () => {
            // Unsubscribe on unmount (acceptance criterion)
            supabase.removeChannel(channel)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [analysisId, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

    const label = STAGE_LABELS[state.stage] ?? 'Processing…'

    // ── Diagnostic query for the exact error message ─────────────────
    const { data: analysisData } = useQuery({
        queryKey: ['diagnostic', analysisId],
        queryFn: async () => {
            const { data } = await supabase.from('analyses').select('app_name').eq('id', analysisId).single()
            return data
        },
        enabled: state.isError, // Only fetch if we're in the error state
    })

    // ── Error state —————————————————————————————————————————————————
    if (state.isError) {
        return (
            <FullscreenShell>
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-severity-high/10 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-severity-high" />
                    </div>
                    <h2 className="font-heading font-semibold text-lg text-text-primary">
                        Analysis failed
                    </h2>
                    <p className="text-text-secondary text-sm max-w-sm">
                        Something went wrong during the analysis. This may be a temporary issue with
                        the scraper or AI service.
                    </p>

                    {analysisData?.app_name && analysisData.app_name.includes('failed') && (
                        <div className="mt-4 p-3 bg-red-950/30 border border-severity-high rounded text-xs text-severity-high text-left break-words w-full">
                            <p className="font-bold mb-1">Diagnostic Log:</p>
                            <span className="font-mono">{analysisData.app_name}</span>
                        </div>
                    )}

                    {onRetry && (
                        <Button variant="secondary" size="md" onClick={onRetry} className="mt-2">
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </Button>
                    )}
                </div>
            </FullscreenShell>
        )
    }

    // ── Main progress UI ─────────────────────────────────────────────
    return (
        <FullscreenShell>
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                {/* Animated logomark */}
                <div className="w-14 h-14 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-md bg-brand-primary animate-pulse" />
                </div>

                {/* Stage label */}
                <div className="text-center">
                    <p className="text-text-primary font-medium text-sm mb-1 transition-all duration-300">
                        {label}
                    </p>
                    <p className="text-text-muted text-xs font-mono">
                        {state.percent}% complete
                    </p>
                </div>

                {/* Progress bar */}
                <Progress value={state.percent} className="w-full" aria-label="Analysis progress" />

                {/* Stage breadcrumb pills */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {BREADCRUMB_STAGES.map(({ stage, label: crumbLabel, threshold }) => (
                        <span
                            key={stage}
                            className={`text-xs px-2 py-0.5 rounded-full transition-all duration-300 ${state.percent >= threshold
                                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                                : 'bg-bg-elevated text-text-muted border border-bg-border'
                                }`}
                        >
                            {crumbLabel}
                        </span>
                    ))}
                </div>

                {/* 30-second timeout warning */}
                {state.isTimedOut && (
                    <p className="text-text-muted text-xs text-center animate-fade-in">
                        Taking longer than expected… The analysis is still running in the background.
                    </p>
                )}
            </div>
        </FullscreenShell>
    )
}

// ── Visual breadcrumb stages ─────────────────────────────────────
const BREADCRUMB_STAGES = [
    { stage: 'scraping', label: 'Scraping', threshold: 10 },
    { stage: 'ai', label: 'AI Analysis', threshold: 50 },
    { stage: 'saving', label: 'Saving', threshold: 95 },
    { stage: 'complete', label: 'Complete', threshold: 100 },
]

// ── Fullscreen layout shell ──────────────────────────────────────
function FullscreenShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6">
            <div className="card w-full max-w-sm text-center items-center flex flex-col gap-6">
                {children}
            </div>
        </div>
    )
}
