// src/components/report/VersionImpactTimeline.tsx
// PRD F-05.4: Version Impact Timeline (sentiment curve across app versions)
// Groups pain points by version_tag. Does not render if no version data.

import { GitCommit } from 'lucide-react'
import type { PainPointRow } from '@/lib/supabaseClient'

interface VersionImpactTimelineProps {
    painPoints: PainPointRow[]
}

export function VersionImpactTimeline({ painPoints }: VersionImpactTimelineProps) {
    // Collect all version_tags and count pain points per version
    const versionMap = new Map<string, { count: number, highSevCount: number }>()

    for (const pp of painPoints) {
        if (!pp.version_tag) continue
        const v = pp.version_tag
        if (!versionMap.has(v)) {
            versionMap.set(v, { count: 0, highSevCount: 0 })
        }
        const data = versionMap.get(v)!
        data.count++
        if (pp.severity === 'High') data.highSevCount++
    }

    // Only render if we have versions
    if (versionMap.size === 0) return null

    // Sort versions by assuming semantic versioning (or string match)
    // Actually, string sort is decent enough for major versions
    const sortedVersions = Array.from(versionMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    return (
        <div className="glass p-8 rounded-[2rem] border-white/5 animate-fade-in">
            <h3 className="text-lg font-heading font-bold text-text-primary mb-6 flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-brand-primary" />
                Version Impact Timeline
            </h3>

            <div className="flex items-end gap-2 overflow-x-auto pt-10 pb-4 px-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mt-10">
                {sortedVersions.map(([version, data], index, arr) => {
                    const height = Math.max(20, Math.min(100, data.count * 15)) // Bar height baseline

                    // Anchor first and last tooltips so they don't bleed out of the scroll container
                    const isFirst = index === 0
                    const isLast = index === arr.length - 1 && arr.length > 1
                    let tooltipPos = "left-1/2 -translate-x-1/2"
                    if (isFirst) tooltipPos = "left-0 -translate-x-4" // slight nudge left, but anchored
                    else if (isLast) tooltipPos = "right-0 translate-x-4" // slight nudge right, but anchored

                    return (
                        <div key={version} className="flex flex-col items-center gap-2 group min-w-[60px]">
                            {/* Bar container */}
                            <div className="h-24 flex items-end relative w-full justify-center">
                                {/* Tooltip */}
                                <div className={`absolute -top-8 ${tooltipPos} opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-bg-elevated text-text-primary text-[11px] font-bold px-3 py-1.5 rounded-md border border-white/10 z-50 pointer-events-none shadow-xl`}>
                                    {data.count} issues
                                    {data.highSevCount > 0 && <span className="text-severity-high ml-1">({data.highSevCount} High)</span>}
                                </div>

                                {/* Bar */}
                                <div
                                    className={`w-8 rounded-t-sm transition-all duration-300 ${data.highSevCount > 0 ? 'bg-severity-high/80 group-hover:bg-severity-high' : 'bg-brand-primary/60 group-hover:bg-brand-primary'}`}
                                    style={{ height: `${height}px` }}
                                />
                            </div>
                            {/* Label */}
                            <span className="text-[10px] font-mono text-text-muted truncate max-w-full px-1">
                                v{version}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
