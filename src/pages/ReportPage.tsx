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
            <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
                <div className="card text-center max-w-sm">
                    <p className="text-text-secondary mb-2">Report not found</p>
                    <p className="text-text-muted text-sm">
                        This analysis may have been deleted or the link is invalid.
                    </p>
                </div>
            </div>
        )
    }

    // ── Loading skeletons ────────────────────────────────────────────
    if (isLoading || !analysis) {
        return (
            <div className="page-wrapper">
                <div className="max-w-3xl mx-auto flex flex-col gap-5 py-10">
                    <AppMetaCardSkeleton />
                    <StarHistogramSkeleton />
                </div>
            </div>
        )
    }

    // ── Analysis still running ───────────────────────────────────────
    if (analysis.status !== 'complete') {
        return (
            <div className="page-wrapper">
                <div className="max-w-3xl mx-auto flex flex-col gap-5 py-10">
                    <AppMetaCardPending appId={analysis.app_id} />
                    <div className="card text-center text-text-muted text-sm">
                        Analysis in progress — results will appear here when complete.
                    </div>
                </div>
            </div>
        )
    }

    // ── Complete ─────────────────────────────────────────────────────
    const reviewCounts =
        (analysis.review_counts as Record<string, number> | null) ?? {}
    const starData = buildStarDistribution(reviewCounts)

    return (
        <div className="page-wrapper">
            <div className="max-w-3xl mx-auto flex flex-col gap-5 py-10">
                {/* App metadata card */}
                <AppMetaCard analysis={analysis} />

                {/* Star distribution histogram */}
                {starData.some((d) => d.count > 0) && (
                    <StarHistogram data={starData} />
                )}

                {/* Pain point cards — TASK-13 */}
                <PainPointCards analysisId={analysisId} />
            </div>
        </div>
    )
}
