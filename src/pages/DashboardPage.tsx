// src/pages/DashboardPage.tsx
// TASK-06: Analysis history dashboard ("My Reports").
// Lists all past analyses for the authenticated user, newest first.
// Redirects unauthenticated users to /auth.

import { Link, Navigate } from 'react-router-dom'
import { Smartphone, BarChart2, AlertTriangle, Loader2, Clock, Star } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUserAnalyses } from '@/hooks/useUserAnalyses'
import type { AnalysisRow, AnalysisStatus } from '@/lib/supabaseClient'

// ── Status badge ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<
    AnalysisStatus,
    { label: string; className: string }
> = {
    complete: {
        label: 'Complete',
        className: 'bg-severity-low/10 text-severity-low border-severity-low/20',
    },
    error: {
        label: 'Failed',
        className: 'bg-severity-high/10 text-severity-high border-severity-high/20',
    },
    scraping: {
        label: 'Scraping',
        className: 'bg-severity-med/10 text-severity-med border-severity-med/20',
    },
    analysing: {
        label: 'Analysing',
        className: 'bg-brand-primary/10 text-brand-hover border-brand-primary/20',
    },
    pending: {
        label: 'Pending',
        className: 'bg-white/5 text-text-muted border-white/5',
    },
}

function StatusBadge({ status }: { status: AnalysisStatus }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}>
            {cfg.label}
        </span>
    )
}

// ── Individual analysis card ───────────────────────────────────────
function AnalysisCard({ analysis }: { analysis: AnalysisRow }) {
    const date = new Date(analysis.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    })

    return (
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-brand-primary/30 hover:shadow-glow transition-all duration-300 group flex flex-col gap-4">
            {/* Header: icon + name */}
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-bg-elevated flex items-center justify-center shadow">
                    {analysis.app_icon_url ? (
                        <img
                            src={analysis.app_icon_url}
                            alt={`${analysis.app_name ?? analysis.app_id} icon`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                        />
                    ) : null}
                    <Smartphone className="w-6 h-6 text-brand-primary/40" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-text-primary text-base truncate group-hover:text-brand-hover transition-colors">
                        {analysis.app_name ?? analysis.app_id}
                    </p>
                    <p className="text-text-muted text-xs font-mono truncate mt-0.5">
                        {analysis.app_id}
                    </p>
                </div>

                <StatusBadge status={analysis.status} />
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs text-text-muted font-medium">
                {analysis.app_rating != null && (
                    <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {analysis.app_rating.toFixed(1)}
                    </span>
                )}
                {analysis.app_category && (
                    <span className="truncate">{analysis.app_category}</span>
                )}
                <span className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {date}
                </span>
            </div>

            {/* CTA */}
            {analysis.status === 'complete' ? (
                <Link
                    to={`/report/${analysis.id}`}
                    className="btn btn-secondary text-xs font-semibold py-2 text-center rounded-xl w-full transition-all group-hover:bg-brand-primary/10 group-hover:text-brand-hover group-hover:border-brand-primary/30"
                >
                    View Report →
                </Link>
            ) : analysis.status === 'error' ? (
                <Link
                    to="/"
                    className="btn btn-ghost text-xs font-semibold py-2 text-center rounded-xl w-full text-severity-high hover:bg-severity-high/10"
                >
                    Retry Analysis
                </Link>
            ) : (
                <Link
                    to={`/analysis/${analysis.id}`}
                    className="btn btn-ghost text-xs font-semibold py-2 text-center rounded-xl w-full text-brand-primary hover:bg-brand-primary/10 flex items-center justify-center gap-1.5"
                >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    In Progress
                </Link>
            )}
        </div>
    )
}

// ── Skeleton card ─────────────────────────────────────────────────
function AnalysisCardSkeleton() {
    return (
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 animate-pulse">
            <div className="flex items-start gap-4">
                <div className="skeleton w-14 h-14 rounded-xl" />
                <div className="flex-1 flex flex-col gap-2 pt-1">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full" />
            </div>
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-9 w-full rounded-xl" />
        </div>
    )
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-24 gap-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                <BarChart2 className="w-10 h-10 text-brand-primary/50" />
            </div>
            <div className="space-y-2 max-w-xs">
                <h2 className="font-heading font-bold text-xl text-text-primary">No analyses yet</h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                    Run your first app analysis to see intelligence reports here.
                </p>
            </div>
            <Link
                to="/"
                className="btn btn-primary text-sm font-semibold py-2.5 px-6 rounded-full shadow-glow hover:shadow-brand-primary/30"
            >
                Analyse an App
            </Link>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth()

    // Redirect unauthenticated users
    if (!authLoading && !user) {
        return <Navigate to={`/auth?redirect=/dashboard`} replace />
    }

    return <DashboardContent />
}

function DashboardContent() {
    const { data: analyses, isLoading, isError } = useUserAnalyses()

    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 bg-grid opacity-20 -z-10" />

            <div className="page-wrapper px-4 py-16">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-10 animate-fade-in">
                        <h1 className="font-heading font-extrabold text-3xl text-text-primary tracking-tight mb-2">
                            My Reports
                        </h1>
                        <p className="text-text-secondary text-sm font-medium">
                            All your app intelligence reports, newest first.
                        </p>
                    </div>

                    {/* Error */}
                    {isError && (
                        <div className="glass p-8 rounded-2xl border border-severity-high/20 flex items-center gap-4 text-severity-high animate-fade-in">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <p className="text-sm font-medium">Failed to load reports. Please refresh the page.</p>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                        {isLoading
                            ? Array.from({ length: 6 }).map((_, i) => <AnalysisCardSkeleton key={i} />)
                            : analyses?.length === 0
                                ? <EmptyState />
                                : analyses?.map((analysis) => (
                                    <AnalysisCard key={analysis.id} analysis={analysis} />
                                ))
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}
