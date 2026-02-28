// src/pages/ReportPage.tsx
// TASK-12: Report Dashboard — top section.
// Composes AppMetaCard + StarHistogram + (TASK-13) PainPointCards.

import { useParams, Navigate } from 'react-router-dom'
import { useAnalysis, buildStarDistribution } from '@/hooks/useAnalysis'
import {
    AppMetaCard,
    AppMetaCardSkeleton,
    AppMetaCardPending,
} from '@/components/report/AppMetaCard'
import {
    StarHistogram,
    StarHistogramSkeleton,
} from '@/components/report/StarHistogram'
import { PainPointCards } from '@/components/report/PainPointCards'


export default function ReportPage() {
    const { analysisId } = useParams<{ analysisId: string }>()
    if (!analysisId) return <Navigate to="/" replace />

    return <ReportContent analysisId={analysisId} />
}

function ReportContent({ analysisId }: { analysisId: string }) {
    const { data: analysis, isLoading, isError } = useAnalysis(analysisId)

    // ── Error ────────────────────────────────────────────────────────
    if (isError) {
        return (
            <div className="relative min-h-[60vh] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-grid opacity-20 -z-10" />
                <div className="glass p-10 rounded-[2rem] text-center max-w-sm border-severity-high/20 animate-fade-in shadow-glass">
                    <div className="w-16 h-16 rounded-full bg-severity-high/10 flex items-center justify-center text-severity-high mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="font-heading font-bold text-xl mb-2 text-text-primary">Report not found</h2>
                    <p className="text-text-secondary text-sm leading-relaxed font-medium">
                        This analysis may have been deleted or the link is expired.
                    </p>
                </div>
            </div>
        )
    }

    // ── Loading skeletons ────────────────────────────────────────────
    if (isLoading || !analysis) {
        return (
            <div className="relative min-h-screen">
                <div className="absolute inset-0 bg-grid opacity-20 -z-10" />
                <div className="page-wrapper px-4">
                    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-16 animate-fade-in">
                        <div className="glass p-10 rounded-[2rem] border-white/5 h-64 skeleton" />
                        <div className="glass p-10 rounded-[2rem] border-white/5 h-48 skeleton" />
                    </div>
                </div>
            </div>
        )
    }

    // ── Analysis still running ───────────────────────────────────────
    if (analysis.status !== 'complete') {
        return (
            <div className="relative min-h-screen">
                <div className="absolute inset-0 bg-grid opacity-20 -z-10" />
                <div className="page-wrapper px-4">
                    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-16">
                        <AppMetaCardPending appId={analysis.app_id} />
                        <div className="glass p-8 rounded-2xl border-white/5 text-center text-text-secondary font-medium animate-pulse">
                            Generating your intelligence report. This usually takes 30-60 seconds...
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Complete Report ──────────────────────────────────────────────
    const reviewCounts =
        (analysis.review_counts as Record<string, number> | null) ?? {}
    const starData = buildStarDistribution(reviewCounts)

    return (
        <div className="relative min-h-screen">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 bg-grid opacity-20 -z-10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100%] h-64 bg-glow-violet opacity-10 -z-10 blur-[100px]" />

            <div className="page-wrapper px-4">
                <div className="max-w-4xl mx-auto flex flex-col gap-8 py-16 animate-fade-in">
                    {/* App metadata card */}
                    <div className="relative group/meta">
                        <div className="absolute -inset-1 bg-brand-primary/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover/meta:opacity-100 transition-opacity duration-500" />
                        <AppMetaCard analysis={analysis} />
                    </div>

                    {/* Star distribution histogram */}
                    {starData.some((d) => d.count > 0) && (
                        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                            <StarHistogram data={starData} />
                        </div>
                    )}

                    {/* Pain point cards — TASK-13 */}
                    <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <PainPointCards analysisId={analysisId} />
                    </div>
                </div>
            </div>
        </div>
    )
}
