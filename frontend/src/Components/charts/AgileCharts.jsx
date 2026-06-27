import React, { useMemo } from 'react'
import {
    ResponsiveContainer, ComposedChart, AreaChart, BarChart, LineChart,
    Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import ChartCard, { chartTheme } from './ChartCard.jsx'
import { CHART_COLORS } from '../../lib/uiMaps.js'


export function BurndownChart({ data = [], title = 'Sprint Burndown', subtitle, height = 300 }) {
    return (
        <ChartCard title={title} subtitle={subtitle} height={height}>
            <ResponsiveContainer>
                <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="day" stroke={chartTheme.axis} fontSize={12} tickLine={false} />
                    <YAxis stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="ideal" name="Ideal" stroke={chartTheme.axis}
                        strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="remaining" name="Remaining" stroke={CHART_COLORS.brand}
                        strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

/**
 * BurnupChart — completed scope vs total scope.
 * data: [{ day, completed, scope }]
 */
export function BurnupChart({ data = [], title = 'Sprint Burnup', subtitle, height = 300 }) {
    return (
        <ChartCard title={title} subtitle={subtitle} height={height}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                        <linearGradient id="burnupFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="day" stroke={chartTheme.axis} fontSize={12} tickLine={false} />
                    <YAxis stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="scope" name="Total scope" stroke={CHART_COLORS.accent}
                        strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.success}
                        strokeWidth={2.5} fill="url(#burnupFill)" />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

/**
 * VelocityChart — committed vs completed story points per sprint.
 * data: [{ sprint, committed, completed }]
 */
export function VelocityChart({ data = [], title = 'Sprint Velocity', subtitle, height = 300 }) {
    return (
        <ChartCard title={title} subtitle={subtitle} height={height}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="sprint" stroke={chartTheme.axis} fontSize={12} tickLine={false} />
                    <YAxis stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="committed" name="Committed" fill={CHART_COLORS.brand} radius={[6, 6, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.success} radius={[6, 6, 0, 0]} maxBarSize={26} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

/**
 * CalendarHeatmap — GitHub-style activity grid.
 * data: [{ date: 'YYYY-MM-DD', count }]  · weeks: how many weeks back to show
 */
export function CalendarHeatmap({ data = [], weeks = 26, title = 'Activity', subtitle, height }) {
    const { grid, max } = useMemo(() => {
        const map = new Map(data.map((d) => [d.date, d.count]))
        const days = []
        const today = new Date()
        const start = new Date(today)
        start.setDate(today.getDate() - weeks * 7 + 1)
        // align to Sunday
        start.setDate(start.getDate() - start.getDay())
        let mx = 0
        for (let i = 0; i < weeks * 7; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            const key = d.toISOString().slice(0, 10)
            const count = map.get(key) || 0
            mx = Math.max(mx, count)
            days.push({ key, count, dow: d.getDay() })
        }
        const cols = []
        for (let w = 0; w < weeks; w++) cols.push(days.slice(w * 7, w * 7 + 7))
        return { grid: cols, max: mx }
    }, [data, weeks])

    const shade = (count) => {
        if (!count) return '#eef2f9'
        const t = max ? count / max : 0
        if (t > 0.75) return '#1d4ed8'
        if (t > 0.5) return '#2563eb'
        if (t > 0.25) return '#60a5fa'
        return '#bfdbfe'
    }

    return (
        <ChartCard title={title} subtitle={subtitle} height={height || 'auto'}>
            <div className="overflow-x-auto">
                <div className="flex gap-1">
                    {grid.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                            {week.map((d) => (
                                <div
                                    key={d.key}
                                    title={`${d.key}: ${d.count}`}
                                    className="w-3 h-3 rounded-[3px]"
                                    style={{ backgroundColor: shade(d.count) }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-ink-faint">
                    <span>Less</span>
                    {['#eef2f9', '#bfdbfe', '#60a5fa', '#2563eb', '#1d4ed8'].map((c) => (
                        <span key={c} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c }} />
                    ))}
                    <span>More</span>
                </div>
            </div>
        </ChartCard>
    )
}
