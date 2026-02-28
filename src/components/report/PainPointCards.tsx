// src/components/report/PainPointCards.tsx
// TASK-13: Pain point cards section — fetches all pain_points for an analysis,
// groups by category, supports severity/category filtering.

import { useState } from 'react'
import { usePainPoints } from '@/hooks/useAnalysis'
import { PainPointCard, PainPointCardSkeleton } from './PainPointCard'

const CATEGORIES = ['All', 'Bug', 'UX Issue', 'Performance', 'Feature Gap', 'Privacy', 'Support']
const SEVERITIES = ['All', 'High', 'Medium', 'Low']

// Sort order for severity
const SEVERITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

interface PainPointCardsProps {
    analysisId: string
}

export function PainPointCards({ analysisId }: PainPointCardsProps) {
    const { data: painPoints, isLoading } = usePainPoints(analysisId)

    const [categoryFilter, setCategoryFilter] = useState('All')
    const [severityFilter, setSeverityFilter] = useState('All')

    // ── Loading ────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <section aria-label="Pain points loading">
                <SectionHeader count={null} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[...Array(4)].map((_, i) => <PainPointCardSkeleton key={i} />)}
                </div>
            </section>
        )
    }

    if (!painPoints?.length) {
        return (
            <div className="card text-center text-text-muted text-sm py-8">
                No pain points were extracted for this analysis.
            </div>
        )
    }

    // ── Filter + sort ─────────────────────────────────────────────────
    const filtered = painPoints
        .filter((p) => categoryFilter === 'All' || p.category === categoryFilter)
        .filter((p) => severityFilter === 'All' || p.severity === severityFilter)
        .sort((a, b) => {
            const sevDiff = (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3)
            if (sevDiff !== 0) return sevDiff
            return b.frequency - a.frequency
        })

    // Active categories (only show filter tags that have data)
    const presentCategories = ['All', ...new Set(painPoints.map((p) => p.category))]

    return (
        <section aria-label="Pain points">
            <SectionHeader count={filtered.length} total={painPoints.length} />

            {/* ── Filters ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 mt-4 mb-4">
                {/* Category filters */}
                {presentCategories
                    .filter((c) => CATEGORIES.includes(c))
                    .map((cat) => (
                        <FilterPill
                            key={cat}
                            label={cat}
                            active={categoryFilter === cat}
                            onClick={() => setCategoryFilter(cat)}
                        />
                    ))}
                <div className="w-px bg-bg-border self-stretch mx-1" />
                {/* Severity filters */}
                {SEVERITIES.map((sev) => (
                    <FilterPill
                        key={sev}
                        label={sev}
                        active={severityFilter === sev}
                        onClick={() => setSeverityFilter(sev)}
                        severity={sev !== 'All' ? sev as 'High' | 'Medium' | 'Low' : undefined}
                    />
                ))}
            </div>

            {/* ── Cards grid ──────────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="card text-center text-text-muted text-sm py-6">
                    No pain points match these filters.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((pp) => (
                        <PainPointCard key={pp.id} painPoint={pp} />
                    ))}
                </div>
            )}
        </section>
    )
}

// ── Sub-components ─────────────────────────────────────────────────

function SectionHeader({ count, total }: { count: number | null; total?: number }) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-base text-text-primary">
                Pain Points
            </h2>
            {count !== null && (
                <span className="text-text-muted text-xs">
                    {count === total || total == null ? `${count} issues` : `${count} of ${total} issues`}
                </span>
            )}
        </div>
    )
}

const SEVERITY_DOT: Record<string, string> = {
    High: 'bg-severity-high',
    Medium: 'bg-severity-medium',
    Low: 'bg-severity-low',
}

function FilterPill({
    label,
    active,
    onClick,
    severity,
}: {
    label: string
    active: boolean
    onClick: () => void
    severity?: 'High' | 'Medium' | 'Low'
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${active
                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                : 'bg-bg-elevated border-bg-border text-text-muted hover:border-brand-primary/30 hover:text-text-secondary'
                }`}
            aria-pressed={active}
        >
            {severity && (
                <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[severity]}`} />
            )}
            {label}
        </button>
    )
}
