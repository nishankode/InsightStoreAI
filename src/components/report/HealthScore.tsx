// src/components/report/HealthScore.tsx
// PRD F-05.2: App Health Score (0–100) with component breakdown ring chart.
// Algorithm: Rating (35) + Responsiveness (20) + Pain Point Base (45) - Penalties

import { useMemo } from 'react'
import { Activity, Star, MessageCircleReply, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalysisRow, PainPointRow } from '@/lib/supabaseClient'

interface HealthScoreProps {
    analysis: AnalysisRow
    painPoints: PainPointRow[]
}

export function HealthScore({ analysis, painPoints }: HealthScoreProps) {
    // ── Score Algorithm ──────────────────────────────────────────────
    const { totalScore, ratingComponent, respComponent, painComponent } = useMemo(() => {
        // 1. Rating (max 35)
        const rating = Number(analysis.app_rating) || 0
        const ratingComponent = Math.round((rating / 5) * 35)

        // 2. Responsiveness (max 20)
        const respRate = Number(analysis.dev_response_rate) || 0
        const respComponent = Math.round((respRate / 100) * 20)

        // 3. Pain Points Penalty (max 45)
        let penalty = 0
        for (const pp of painPoints) {
            if (pp.severity === 'High') penalty += 9
            else if (pp.severity === 'Medium') penalty += 4
            else if (pp.severity === 'Low') penalty += 1
        }

        const painComponent = Math.max(0, 45 - penalty) // Clamp at 0 minimum score for this component

        const totalScore = ratingComponent + respComponent + painComponent

        return { totalScore, ratingComponent, respComponent, painComponent }
    }, [analysis.app_rating, analysis.dev_response_rate, painPoints])

    // ── SVG Ring Math ──────────────────────────────────────────────────
    const size = 160
    const strokeWidth = 12
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    // Offset for the filled portion
    const offset = circumference - (totalScore / 100) * circumference

    // Determine color based on score
    let scoreColor = 'text-brand-primary' // >= 80
    if (totalScore < 50) scoreColor = 'text-severity-high'
    else if (totalScore < 80) scoreColor = 'text-severity-med'

    return (
        <div className="glass p-8 sm:p-10 rounded-[2.5rem] border-white/5 flex flex-col md:flex-row items-center gap-10 shadow-glass animate-fade-in relative overflow-hidden">
            {/* Background glow matching the score */}
            <div className={cn('absolute -inset-4 opacity-[0.03] blur-3xl rounded-[3rem] transition-colors duration-1000 -z-10', scoreColor.replace('text-', 'bg-'))} />

            {/* ── Main Gauge (Left) ────────────────────────────────────── */}
            <div className="relative flex flex-col items-center flex-shrink-0">
                <div className="relative w-40 h-40">
                    {/* Background track */}
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="currentColor"
                            className="text-white/5"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {/* Foreground animated ring */}
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="currentColor"
                            className={cn('transition-all duration-1000 ease-out drop-shadow-lg', scoreColor)}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                        />
                    </svg>

                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Activity className={cn('w-5 h-5 mb-1 opacity-80', scoreColor)} />
                        <span className="font-heading font-black text-4xl text-text-primary tracking-tighter">
                            {totalScore}
                        </span>
                        <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase mt-0.5">
                            Health
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Component Breakdown (Right) ─────────────────────────── */}
            <div className="flex-1 min-w-0 w-full">
                <h3 className="text-lg font-heading font-bold text-text-primary mb-5 flex items-center gap-2">
                    Score Breakdown
                    <span className="badge bg-white/5 text-text-muted px-2 py-0.5 text-[10px]">Algorithm V2</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Rating sub-score */}
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold uppercase tracking-wider">
                            <Star className="w-3.5 h-3.5" />
                            <span>Rating</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-text-primary">{ratingComponent}</span>
                            <span className="text-xs text-text-muted">/ 35</span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-snug">
                            Based on {analysis.app_rating ? Number(analysis.app_rating).toFixed(1) : 'N/A'} store average
                        </p>
                    </div>

                    {/* Responsiveness sub-score */}
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold uppercase tracking-wider">
                            <MessageCircleReply className="w-3.5 h-3.5" />
                            <span>Replies</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-text-primary">{respComponent}</span>
                            <span className="text-xs text-text-muted">/ 20</span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-snug">
                            {analysis.dev_response_rate ? `${analysis.dev_response_rate}% response rate` : 'No reply baseline'}
                        </p>
                    </div>

                    {/* Pain points sub-score */}
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Stability</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-text-primary">{painComponent}</span>
                            <span className="text-xs text-text-muted">/ 45</span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-snug">
                            Penalty applied for {painPoints.length} extracted pain points
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
