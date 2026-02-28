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
        badgeClass: 'badge-high',
        dotColor: 'bg-severity-high',
    },
    Medium: {
        label: 'Medium',
        badgeClass: 'badge-medium',
        dotColor: 'bg-severity-med', // Matches tailwind.config colors.severity.med
    },
    Low: {
        label: 'Low',
        badgeClass: 'badge-low',
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
            className="glass group p-8 rounded-[2.5rem] border-white/5 flex flex-col gap-6 shadow-glass hover:shadow-glow-violet/10 transition-all duration-500 animate-fade-in"
            aria-label={`${painPoint.category}: ${painPoint.severity} severity`}
        >
            {/* ── Header row ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Severity badge */}
                    <span className={cn('badge px-3 py-1 text-[10px] font-bold tracking-wider uppercase border-white/10 shadow-sm', sev.badgeClass)}>
                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-2 shadow-sm', sev.dotColor)} />
                        {sev.label}
                    </span>

                    {/* Category tag */}
                    <span className="badge bg-white/5 text-text-muted border border-white/5 text-[10px] font-bold tracking-wider uppercase px-3 py-1">
                        {painPoint.category}
                    </span>
                </div>

                {/* Frequency pill */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/5">
                    <TrendingUp className="w-3 h-3 text-brand-primary opacity-70" />
                    <span className="text-[10px] text-text-muted font-bold tracking-tight">
                        {painPoint.frequency}
                    </span>
                </div>
            </div>

            {/* ── Description ─────────────────────────────────────────── */}
            <p className="text-text-primary text-base font-medium leading-relaxed tracking-tight">
                {painPoint.description}
            </p>

            {/* ── Representative quotes ───────────────────────────────── */}
            {quotes.length > 0 && (
                <div className="space-y-3 pt-2">
                    {quotes.map((quote, i) => (
                        <blockquote
                            key={i}
                            className="relative flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group/quote hover:bg-white/10 transition-colors"
                        >
                            <Quote className="w-4 h-4 text-brand-primary opacity-40 shrink-0 mt-0.5" aria-hidden />
                            <p className="text-sm text-text-secondary leading-relaxed font-medium italic opacity-80">
                                "{quote}"
                            </p>
                        </blockquote>
                    ))}
                </div>
            )}

            {/* ── Improvement plan (Integrated) ────────────────────────── */}
            {imp && (
                <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold tracking-wider uppercase text-text-muted">
                        <div className="flex items-center gap-1.5 text-brand-primary">
                            {phase.icon}
                            <span>{phase.label}</span>
                        </div>
                        <span className="opacity-20">|</span>
                        <span>Effort: <span className="text-text-secondary">{imp.effort}</span></span>
                        <span className="opacity-20">|</span>
                        <span>Impact: <span className="text-text-secondary">{imp.impact}</span></span>
                    </div>

                    <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 group/rec hover:bg-brand-primary/10 transition-colors">
                        <div className="flex items-start gap-3">
                            <Zap className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-text-primary leading-relaxed font-semibold">
                                {imp.recommendation}
                            </p>
                        </div>
                    </div>
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
