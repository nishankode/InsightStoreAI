// src/components/report/StarHistogram.tsx
// Bar chart showing the distribution of 1★, 2★, 3★ reviews.
// Uses Recharts with design-system color tokens.

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import type { StarDistribution } from '@/hooks/useAnalysis'

interface StarHistogramProps {
    data: StarDistribution[]
}

// Star tier colors — use severity palette as per PRD/design system
// 1★ = High severity (red), 2★ = Medium (amber), 3★ = Low (green-ish teal)
const TIER_COLORS: Record<number, string> = {
    1: 'var(--severity-high)',
    2: 'var(--severity-med)',
    3: 'var(--severity-low)',
}

const TIER_LABELS: Record<number, string> = {
    1: '1 ★',
    2: '2 ★',
    3: '3 ★',
}

// Custom tooltip
function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean
    payload?: Array<{ payload: StarDistribution }>
}) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 shadow-lg text-xs">
            <p className="text-text-primary font-semibold mb-1">{TIER_LABELS[d.star]}</p>
            <p className="text-text-secondary">{d.count.toLocaleString()} reviews</p>
            <p className="text-text-muted">{d.percent}% of total</p>
        </div>
    )
}

// Custom label inside bars
function BarLabel({
    x = 0,
    y = 0,
    width = 0,
    value,
}: {
    x?: number
    y?: number
    width?: number
    value?: number
}) {
    if (!value) return null
    return (
        <text
            x={x + width / 2}
            y={y - 6}
            fill="var(--text-secondary)"
            textAnchor="middle"
            fontSize={11}
            fontFamily="var(--font-body)"
        >
            {value}%
        </text>
    )
}

export function StarHistogram({ data }: StarHistogramProps) {
    const totalReviews = data.reduce((s, d) => s + d.count, 0)

    return (
        <div className="glass p-8 rounded-[2rem] border-white/5 shadow-glass animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <h2 className="font-heading font-bold text-lg text-text-primary tracking-tight">
                    Review Distribution
                </h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                    <span className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">
                        {totalReviews.toLocaleString()} reviews
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                    barCategoryGap="35%"
                >
                    <XAxis
                        dataKey="star"
                        tickFormatter={(v) => TIER_LABELS[v] ?? `${v}★`}
                        tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-heading)' }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-body)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 4, 4]} label={<BarLabel />}>
                        {data.map((entry) => (
                            <Cell
                                key={entry.star}
                                fill={TIER_COLORS[entry.star] ?? 'var(--brand-primary)'}
                                fillOpacity={1}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-8 pt-6 border-t border-white/5">
                {data.map((d) => (
                    <div key={d.star} className="flex items-center gap-2.5 text-xs text-text-secondary font-semibold">
                        <span
                            className="inline-block w-3 h-3 rounded-full shadow-sm"
                            style={{ background: TIER_COLORS[d.star] }}
                        />
                        <span>{TIER_LABELS[d.star]}</span>
                        <span className="text-text-muted opacity-60">·</span>
                        <span className="text-text-primary">{d.count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Skeleton variant ──────────────────────────────────────────────
export function StarHistogramSkeleton() {
    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
            </div>
            <div className="flex items-end justify-center gap-6 h-40">
                {[60, 90, 45].map((h, i) => (
                    <div key={i} className="skeleton rounded-t" style={{ height: `${h}%`, width: 56 }} />
                ))}
            </div>
        </div>
    )
}
