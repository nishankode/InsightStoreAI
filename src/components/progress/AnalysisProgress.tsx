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
    scraping: 'Starting data collection…',
    scraping_1star: 'Fetching 1-star reviews…',
    scraping_2star: 'Fetching 2-star reviews…',
    scraping_3star: 'Fetching 3-star reviews…',
    scraping_complete: 'Reviews collected. Starting AI analysis…',
    ai_analysis_start: 'AI is analysing the reviews…',
    ai_analysis_complete: 'Pain points extracted. Saving results…',
    saving_results: 'Saving for you…',
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
            return data as { app_name: string | null } | null
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
                        Something went wrong during the analysis. Please try again later.
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
            <div className="flex flex-col items-center gap-10 w-full max-w-md animate-fade-in px-4">
                {/* Animated Premium Logomark */}
                <div className="relative group">
                    <div className="absolute -inset-4 bg-brand-primary/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shadow-glow">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary shadow-[0_0_20px_rgba(124,58,237,0.5)] animate-bounce" style={{ animationDuration: '2s' }} />
                    </div>
                </div>

                {/* Stage information */}
                <div className="text-center space-y-3">
                    <h2 className="text-text-primary font-bold text-xl tracking-tight transition-all duration-500">
                        {label}
                    </h2>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                        <span className="text-brand-primary text-[10px] font-extrabold uppercase tracking-widest font-mono">
                            {state.percent}% complete
                        </span>
                    </div>
                </div>

                {/* Refined Progress bar */}
                <div className="w-full relative py-2">
                    <div className="absolute -inset-1 bg-brand-primary/5 blur-md rounded-full" />
                    <Progress
                        value={state.percent}
                        className="h-2.5 w-full bg-white/5 overflow-hidden rounded-full border border-white/5"
                        aria-label="Analysis progress"
                    />
                </div>

                {/* Stage breadcrumb pills (Refined) */}
                <div className="flex flex-wrap justify-center gap-2.5">
                    {BREADCRUMB_STAGES.map(({ stage, label: crumbLabel, threshold }) => (
                        <div
                            key={stage}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] font-bold tracking-wider uppercase transition-all duration-500 ${state.percent >= threshold
                                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30 shadow-glow-violet/5'
                                : 'bg-white/3 text-text-muted border border-white/5 opacity-40'
                                }`}
                        >
                            <div className={`w-1 h-1 rounded-full ${state.percent >= threshold ? 'bg-brand-primary shadow-glow' : 'bg-current opacity-30'}`} />
                            {crumbLabel}
                        </div>
                    ))}
                </div>

                {/* 30-second timeout warning (Refined) */}
                {state.isTimedOut && (
                    <div className="flex items-center gap-2 text-text-muted text-[11px] font-medium animate-fade-in bg-white/5 px-4 py-2 rounded-full border border-white/5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Taking a moment... heavy analysis in progress</span>
                    </div>
                )}
            </div>
        </FullscreenShell>
    )
}

// ── Visual breadcrumb stages (Metadata) ─────────────────────────
const BREADCRUMB_STAGES = [
    { stage: 'fetching', label: 'Extracting', threshold: 10 },
    { stage: 'analyzing', label: 'Processing', threshold: 50 },
    { stage: 'organizing', label: 'Structuring', threshold: 85 },
    { stage: 'finalizing', label: 'Finalizing', threshold: 100 },
]

// ── Fullscreen layout shell (Standardised Premium Layout) ────────
function FullscreenShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-bg-base relative isolate overflow-hidden flex flex-col items-center justify-center p-6 sm:p-12">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 -z-10 bg-grid opacity-30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-glow-violet opacity-10 -z-10 blur-[150px]" />

            <div className="glass w-full max-w-lg p-10 sm:p-16 rounded-[3rem] border-white/5 text-center items-center flex flex-col gap-10 shadow-glass animate-scale-in">
                {children}
            </div>
        </div>
    )
}
