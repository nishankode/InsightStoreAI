// src/components/report/AppMetaCard.tsx
// Report page top section: app icon, name, developer, rating, installs, last updated.
// Skeleton version shown while data loads.

import { useState } from 'react'
import { Star, Download, RefreshCw, Share2, Check, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'
import type { AnalysisRow } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

interface AppMetaCardProps {
    analysis: AnalysisRow
}

export function AppMetaCard({ analysis }: AppMetaCardProps) {
    const { app_name, app_icon_url, app_rating, app_installs, user_id, is_public, id } = analysis
    const { user } = useAuth()
    const isOwner = user?.id === user_id
    const [isShared, setIsShared] = useState(is_public)
    const [isCopied, setIsCopied] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleShare = async () => {
        if (!isOwner || isUpdating) return

        setIsUpdating(true)
        const newSharedState = !isShared

        // Update database
        const { error } = await supabase
            .from('analyses')
            .update({ is_public: newSharedState })
            .eq('id', id)

        if (!error) {
            setIsShared(newSharedState)
            if (newSharedState) {
                // Copy link and show feedback
                const link = `${window.location.origin}/report/${id}`
                await navigator.clipboard.writeText(link)
                setIsCopied(true)
                setTimeout(() => setIsCopied(false), 2000)
            }
        }
        setIsUpdating(false)
    }

    return (
        <div className="card flex flex-col md:flex-row items-start gap-5">
            {/* Icon */}
            <div className="flex-shrink-0">
                {app_icon_url ? (
                    <img
                        src={app_icon_url}
                        alt={`${app_name ?? 'App'} icon`}
                        className="w-16 h-16 rounded-xl object-cover border border-bg-border"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-xl bg-bg-elevated border border-bg-border flex items-center justify-center">
                        <span className="text-2xl" aria-hidden>📱</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h1 className="font-heading font-bold text-xl text-text-primary leading-tight truncate">
                    {app_name ?? analysis.app_id}
                </h1>
                <p className="code-inline text-xs mt-1">{analysis.app_id}</p>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                    {app_rating != null && (
                        <MetaStat icon={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}>
                            <span className="text-text-primary font-semibold">{app_rating.toFixed(1)}</span>
                            <span className="text-text-muted"> / 5</span>
                        </MetaStat>
                    )}
                    {app_installs && (
                        <MetaStat icon={<Download className="w-3.5 h-3.5 text-text-muted" />}>
                            <span className="text-text-secondary">{app_installs}</span>
                        </MetaStat>
                    )}
                    <MetaStat icon={<RefreshCw className="w-3.5 h-3.5 text-text-muted" />}>
                        <span className="text-text-muted">
                            Analysed {new Date(analysis.created_at).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                            })}
                        </span>
                    </MetaStat>
                </div>
            </div>

            {/* Actions */}
            {isOwner && (
                <div className="mt-4 md:mt-0 flex-shrink-0 w-full md:w-auto">
                    <button
                        onClick={handleShare}
                        disabled={isUpdating}
                        className={cn(
                            "w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            isShared
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                                : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-bg-border hover:border-text-muted"
                        )}
                    >
                        {isUpdating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : isCopied ? (
                            <Check className="w-4 h-4" />
                        ) : isShared ? (
                            <Globe className="w-4 h-4" />
                        ) : (
                            <Share2 className="w-4 h-4" />
                        )}
                        {isCopied
                            ? "Link copied!"
                            : isShared
                                ? "Public Link"
                                : "Share Report"}
                    </button>
                    {isShared && (
                        <p className="text-[10px] text-emerald-600/80 mt-1.5 text-center px-1">
                            Anyone with the link can view
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

function MetaStat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-sm">
            {icon}
            {children}
        </span>
    )
}

// ── Skeleton variant ───────────────────────────────────────────────
export function AppMetaCardSkeleton() {
    return (
        <div className="card flex items-start gap-5">
            <div className="skeleton w-16 h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
                <div className="skeleton h-6 w-48 rounded" />
                <div className="skeleton h-4 w-32 rounded" />
                <div className="flex gap-4 mt-3">
                    <div className="skeleton h-4 w-16 rounded" />
                    <div className="skeleton h-4 w-24 rounded" />
                </div>
            </div>
        </div>
    )
}

// ── In-progress placeholder ────────────────────────────────────────
export function AppMetaCardPending({ appId }: { appId: string }) {
    return (
        <div className={cn('card flex items-center gap-4')}>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                <div className="w-5 h-5 rounded-md bg-brand-primary animate-pulse" />
            </div>
            <div>
                <p className="text-text-secondary text-sm">Analysis in progress…</p>
                <p className="code-inline text-xs mt-1">{appId}</p>
            </div>
        </div>
    )
}
