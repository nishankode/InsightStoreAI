// src/components/report/DevResponsivenessBadge.tsx
// PRD F-05.6: Developer Responsiveness badge (response rate % + avg reply time)
// Returns null if data is missing.

import { MessageSquareReply } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DevResponsivenessBadgeProps {
    rate: number | null
    avgDays: number | null
}

export function DevResponsivenessBadge({ rate, avgDays }: DevResponsivenessBadgeProps) {
    if (rate === null || avgDays === null) return null

    const numRate = Number(rate)
    const numDays = Number(avgDays)

    // Color code based on response rate
    let colorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    if (numRate < 30) colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    if (numRate < 10) colorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20'

    return (
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm', colorClass)}>
            <MessageSquareReply className="w-4 h-4" />
            <span className="text-xs font-bold tracking-tight">
                Developer responds to {numRate.toFixed(0)}% of reviews · avg {numDays.toFixed(1)} days
            </span>
        </div>
    )
}
