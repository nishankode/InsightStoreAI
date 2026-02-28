// src/components/report/PainPointCard.tsx
// TASK-13: Single pain point card — severity badge, frequency, description, quotes.
// One card per pain_points row; displayed in a grid on the ReportPage.

import { Quote, Zap, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PainPointRow } from '@/lib/supabaseClient'

interface PainPointCardProps {
    painPoint: PainPointRow
}

// ── Severity display config ────────────────────────────────────────
const SEVERITY_CONFIG = {
    High: {
        label: 'High',
        badgeClass: 'badge-error',
        dotColor: 'bg-severity-high',
    },
    Medium: {
        label: 'Medium',
        badgeClass: 'badge-warn',
        dotColor: 'bg-severity-medium',
    },
    Low: {
        label: 'Low',
        badgeClass: 'badge-info',
        dotColor: 'bg-severity-low',
    },
} as const

// ── Phase display config ───────────────────────────────────────────
const PHASE_CONFIG = {
    'Quick Win': { icon: <Zap className="w-3 h-3" />, label: 'Quick Win' },
    'Short-Term': { icon: <Clock className="w-3 h-3" />, label: 'Short-Term' },
    'Long-Term': { icon: <TrendingUp className="w-3 h-3" />, label: 'Long-Term' },
} as const

type Severity = keyof typeof SEVERITY_CONFIG
type Phase = keyof typeof PHASE_CONFIG

export function PainPointCard({ painPoint }: PainPointCardProps) {
    const sev = SEVERITY_CONFIG[(painPoint.severity as Severity)] ?? SEVERITY_CONFIG.Medium
    const imp = painPoint.improvement as {
        recommendation: string
        phase: Phase
        effort: string
        impact: string
    }
    const phase = PHASE_CONFIG[imp?.phase] ?? PHASE_CONFIG['Short-Term']
    const quotes: string[] = Array.isArray(painPoint.representative_quotes)
        ? (painPoint.representative_quotes as string[])
        : []

    return (
        <article
            className="card gap-4 group hover:border-bg-border/80 transition-colors"
            aria-label={`${painPoint.category}: ${painPoint.severity} severity`}
        >
            {/* ── Header row ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity badge */}
                    <span className={cn('badge text-xs', sev.badgeClass)}>
                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full', sev.dotColor)} />
                        {sev.label}
                    </span>

                    {/* Category tag */}
                    <span className="badge badge-default text-xs">{painPoint.category}</span>
                </div>

                {/* Frequency pill */}
                <span
                    className="text-xs text-text-muted whitespace-nowrap"
                    title="Number of reviews mentioning this issue"
                >
                    {painPoint.frequency} reviews
                </span>
            </div>

            {/* ── Description ─────────────────────────────────────────── */}
            <p className="text-text-secondary text-sm leading-relaxed">
                {painPoint.description}
            </p>

            {/* ── Representative quotes ───────────────────────────────── */}
            {quotes.length > 0 && (
                <div className="space-y-2">
                    {quotes.map((quote, i) => (
                        <blockquote
                            key={i}
                            className="flex items-start gap-2 text-xs text-text-muted italic border-l-2 border-bg-border pl-3 leading-relaxed"
                        >
                            <Quote className="w-3 h-3 mt-0.5 flex-shrink-0 text-text-muted/50" aria-hidden />
                            {quote}
                        </blockquote>
                    ))}
                </div>
            )}

            {/* ── Improvement plan ────────────────────────────────────── */}
            {imp && (
                <div className="bg-bg-elevated rounded-lg p-3 border border-bg-border space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        {phase.icon}
                        <span className="font-medium text-text-secondary">{phase.label}</span>
                        <span className="text-bg-border">·</span>
                        <span>Effort: {imp.effort}</span>
                        <span className="text-bg-border">·</span>
                        <span>Impact: {imp.impact}</span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">
                        {imp.recommendation}
                    </p>
                </div>
            )}
        </article>
    )
}

// ── Skeleton variant ───────────────────────────────────────────────
export function PainPointCardSkeleton() {
    return (
        <div className="card gap-4">
            <div className="flex items-center gap-2">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-4 w-3/5 rounded" />
            </div>
            <div className="skeleton h-16 w-full rounded-lg" />
        </div>
    )
}
