import React from 'react'
import { GlassCard } from '../../design-system/primitives.jsx'

export default function ChartCard({ title, subtitle, actions, height = 300, children, className = '' }) {
    return (
        <GlassCard hoverEffect={false} padding="p-5" className={className}>
            {(title || actions) && (
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
                        {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
                    </div>
                    {actions}
                </div>
            )}
            <div style={{ width: '100%', height }}>{children}</div>
        </GlassCard>
    )
}

export const chartTheme = {
    grid: '#e6eaf2',
    axis: '#8a93a6',
    tooltip: {
        contentStyle: {
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid #e6eaf2',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(16,24,40,0.12)',
            fontSize: 12,
            color: '#0b1220',
        },
        labelStyle: { color: '#4b5563', fontWeight: 600 },
        cursor: { fill: 'rgba(37,99,235,0.06)' },
    },
}
