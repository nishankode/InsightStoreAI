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
        <div className="glass p-8 sm:p-10 rounded-[2.5rem] border-white/5 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-glass transition-all duration-300">
            {/* Icon */}
            <div className="relative group/icon flex-shrink-0">
                <div className="absolute -inset-2 bg-brand-primary/20 rounded-2xl blur-lg opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                {app_icon_url ? (
                    <img
                        src={app_icon_url}
                        alt={`${app_name ?? 'App'} icon`}
                        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-white/10 shadow-lg"
                        loading="lazy"
                    />
                ) : (
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-bg-elevated border border-white/10 flex items-center justify-center shadow-lg">
                        <span className="text-4xl" aria-hidden>📱</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-text-primary tracking-tight truncate">
                        {app_name ?? analysis.app_id}
                    </h1>
                    <span className="code-inline text-[10px] w-fit mx-auto md:mx-0 px-2.5 py-1 bg-white/5 rounded-full text-brand-hover border border-white/5">
                        {analysis.app_id}
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4">
                    {app_rating != null && (
                        <MetaStat icon={<Star className="w-4 h-4 fill-amber-400 text-amber-400" />}>
                            <span className="text-text-primary font-bold text-lg">{app_rating.toFixed(1)}</span>
                            <span className="text-text-muted font-medium"> / 5</span>
                        </MetaStat>
                    )}
                    {app_installs && (
                        <MetaStat icon={<Download className="w-4 h-4 text-brand-primary" />}>
                            <span className="text-text-secondary font-bold text-lg">{app_installs}</span>
                        </MetaStat>
                    )}
                    <MetaStat icon={<RefreshCw className="w-4 h-4 text-text-muted" />}>
                        <span className="text-text-muted font-medium text-sm">
                            {new Date(analysis.created_at).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                            })}
                        </span>
                    </MetaStat>
                </div>
            </div>

            {/* Actions */}
            {isOwner && (
                <div className="mt-6 md:mt-0 flex-shrink-0 w-full md:w-auto">
                    <button
                        onClick={handleShare}
                        disabled={isUpdating}
                        className={cn(
                            "w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
                            isShared
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30"
                                : "bg-white/5 text-text-secondary hover:text-text-primary border border-white/10 hover:border-white/20 hover:bg-white/10"
                        )}
                    >
                        {isUpdating ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
                        ) : isCopied ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                        ) : isShared ? (
                            <Globe className="w-4 h-4" />
                        ) : (
                            <Share2 className="w-4 h-4" />
                        )}
                        <span>
                            {isCopied
                                ? "Copied!"
                                : isShared
                                    ? "Public Access"
                                    : "Share Report"}
                        </span>
                    </button>
                    {isShared && (
                        <div className="flex items-center justify-center gap-1.5 mt-3 opacity-60">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase">
                                Available globally
                            </p>
                        </div>
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
