// src/components/search/AppPreviewCard.tsx
// TASK-10: App Preview Card — shown after a successful metadata fetch.
// Displays app icon, name, developer, rating, installs, category.
// CTA: "Analyse This App" → calls onAnalyse(app_id).

import { useState } from 'react'
import { Star, Download, Tag, RefreshCw, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppMetadata } from '@/lib/api'

interface AppPreviewCardProps {
    metadata: AppMetadata
    onAnalyse: (appId: string) => void
    isAnalysing?: boolean
}

export function AppPreviewCard({ metadata, onAnalyse, isAnalysing = false }: AppPreviewCardProps) {
    const [iconError, setIconError] = useState(false)

    return (
        <div
            className="card w-full max-w-2xl animate-fade-in"
            role="region"
            aria-label={`App preview: ${metadata.name}`}
        >
            <div className="flex items-start gap-4">
                {/* ── App Icon ───────────────────────────────────────────── */}
                <div className="flex-shrink-0">
                    {!iconError ? (
                        <img
                            src={metadata.icon}
                            alt={`${metadata.name} icon`}
                            className="w-16 h-16 rounded-xl object-cover border border-bg-border"
                            onError={() => setIconError(true)}
                            // keyboard nav: icon is decorative, not interactive
                            tabIndex={-1}
                        />
                    ) : (
                        // Fallback placeholder — uses design system surface + brand color
                        <div
                            className="w-16 h-16 rounded-xl bg-bg-elevated border border-bg-border flex items-center justify-center"
                            aria-label="App icon unavailable"
                        >
                            <Code2 className="w-7 h-7 text-text-muted" aria-hidden />
                        </div>
                    )}
                </div>

                {/* ── App Info ───────────────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                    {/* Name */}
                    <h2
                        className="font-heading font-semibold text-base text-text-primary leading-tight truncate"
                        tabIndex={0}
                    >
                        {metadata.name}
                    </h2>

                    {/* Developer */}
                    <p className="text-text-secondary text-xs mt-0.5 truncate">
                        {metadata.developer}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                        {/* Rating — numeric + star icon (not star-fill bar, per acceptance criterion) */}
                        <StatPill icon={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}>
                            <span className="text-text-primary font-medium">
                                {metadata.rating.toFixed(1)}
                            </span>
                            <span className="text-text-muted">/ 5</span>
                        </StatPill>

                        {/* Installs */}
                        <StatPill icon={<Download className="w-3.5 h-3.5 text-text-muted" />}>
                            <span className="text-text-secondary">{metadata.installs}</span>
                        </StatPill>

                        {/* Category */}
                        <StatPill icon={<Tag className="w-3.5 h-3.5 text-text-muted" />}>
                            <span className="text-text-secondary">{metadata.category}</span>
                        </StatPill>

                        {/* Last updated */}
                        {metadata.last_updated && (
                            <StatPill icon={<RefreshCw className="w-3.5 h-3.5 text-text-muted" />}>
                                <span className="text-text-muted">
                                    Updated {formatDate(metadata.last_updated)}
                                </span>
                            </StatPill>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Divider ─────────────────────────────────────────────── */}
            <div className="divider my-4" />

            {/* ── Package ID + CTA ────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
                <span className="code-inline text-xs truncate max-w-xs">
                    {metadata.app_id}
                </span>

                <Button
                    variant="primary"
                    size="md"
                    onClick={() => onAnalyse(metadata.app_id)}
                    disabled={isAnalysing}
                    aria-label={`Analyse ${metadata.name}`}
                    className="shrink-0"
                >
                    {isAnalysing ? 'Starting analysis…' : 'Analyse This App'}
                </Button>
            </div>
        </div>
    )
}

// ── Small helper: stat pill ────────────────────────────────────────
function StatPill({
    icon,
    children,
}: {
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs">
            {icon}
            {children}
        </span>
    )
}

// ── Date formatter ─────────────────────────────────────────────────
function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    } catch {
        return iso
    }
}
