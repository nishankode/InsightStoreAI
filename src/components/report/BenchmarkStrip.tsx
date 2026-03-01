// src/components/report/BenchmarkStrip.tsx
// PRD F-05.7: "Your 3.8 vs Productivity avg 4.1 — bottom 30% of category."
// Uses static logic table for category averages.

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalysisRow } from '@/lib/supabaseClient'

interface BenchmarkStripProps {
    analysis: AnalysisRow
}

// Static fallback logic for demonstration given Google Play doesn't expose this API
const CATEGORY_BENCHMARKS: Record<string, number> = {
    'PRODUCTIVITY': 4.1,
    'GAME': 4.3,
    'SOCIAL': 3.9,
    'FINANCE': 4.2,
    'HEALTH_AND_FITNESS': 4.5,
    'EDUCATION': 4.4,
    'LIFESTYLE': 4.0,
    'SHOPPING': 4.3,
    'ENTERTAINMENT': 4.1,
}
const DEFAULT_BENCHMARK = 4.2

export function BenchmarkStrip({ analysis }: BenchmarkStripProps) {
    const rawRating = analysis.app_rating
    const cat = analysis.app_category?.toUpperCase()

    if (!rawRating || !cat) return null

    const rating = Number(rawRating)

    // Extract average from static map or use default
    let avg = DEFAULT_BENCHMARK
    for (const [key, val] of Object.entries(CATEGORY_BENCHMARKS)) {
        if (cat.includes(key)) {
            avg = val
            break
        }
    }

    const diff = rating - avg

    // Rough percentile heuristic based on distance from mean
    let percentileText = ''
    if (diff > 0.4) percentileText = 'top 10%'
    else if (diff > 0.2) percentileText = 'top 20%'
    else if (diff > 0) percentileText = 'top 40%'
    else if (diff > -0.2) percentileText = 'bottom 40%'
    else if (diff > -0.4) percentileText = 'bottom 20%'
    else percentileText = 'bottom 10%'

    let icon = <TrendingUp className="w-4 h-4 text-emerald-500" />
    let colorClass = 'border-emerald-500/30 bg-emerald-500/5'

    if (diff < -0.1) {
        icon = <TrendingDown className="w-4 h-4 text-rose-500" />
        colorClass = 'border-rose-500/30 bg-rose-500/5'
    } else if (diff <= 0.1) {
        icon = <Minus className="w-4 h-4 text-amber-500" />
        colorClass = 'border-amber-500/30 bg-amber-500/5'
    }

    return (
        <div className={cn("flex items-center gap-3 p-4 rounded-2xl border", colorClass)}>
            {icon}
            <p className="text-sm font-medium text-text-primary">
                Your <span className="font-bold">{rating.toFixed(1)}</span> vs {analysis.app_category} avg <span className="font-bold">{avg.toFixed(1)}</span> — <span className="opacity-80">{percentileText} of category.</span>
            </p>
        </div>
    )
}
