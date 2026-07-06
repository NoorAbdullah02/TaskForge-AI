import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './primitives.jsx'

/**
 * PageContainer — consistent max-width + padding for every page.
 */
export const PageContainer = ({ children, className = '', size = 'xl' }) => {
    const max = { md: 'max-w-4xl', lg: 'max-w-5xl', xl: 'max-w-7xl', full: 'max-w-none' }
    return (
        <div className={`mx-auto w-full ${max[size] || max.xl} px-4 sm:px-6 lg:px-8 py-6 ${className}`}>
            {children}
        </div>
    )
}

/**
 * PageHeader — title, subtitle, optional icon + actions slot.
 */
export const PageHeader = ({ title, subtitle, icon: Icon, actions, className = '' }) => (
    <div className={`flex flex-wrap items-start justify-between gap-4 mb-6 ${className}`}>
        <div className="flex items-start gap-3">
            {Icon && (
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand/10 text-brand shrink-0">
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
                {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
            </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
)

/**
 * SectionCard — labelled content block built on GlassCard.
 */
export const SectionCard = ({ title, subtitle, actions, children, className = '', padding = 'p-6' }) => (
    <GlassCard hoverEffect={false} padding={padding} className={className}>
        {(title || actions) && (
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
                    {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
                </div>
                {actions}
            </div>
        )}
        {children}
    </GlassCard>
)

/**
 * StatCard — KPI tile with trend.
 */
export const StatCard = ({ label, value, icon: Icon, trend, tone = 'brand', className = '' }) => {
    const tones = {
        brand: 'bg-brand/10 text-brand',
        success: 'bg-emerald-50 text-emerald-600',
        warning: 'bg-amber-50 text-amber-600',
        danger: 'bg-red-50 text-red-600',
        accent: 'bg-accent/10 text-accent',
    }
    const trendUp = typeof trend === 'number' ? trend >= 0 : null
    return (
        <GlassCard padding="p-5" className={className}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-ink mt-2">{value}</p>
                </div>
                {Icon && (
                    <div className={`grid place-items-center w-10 h-10 rounded-xl ${tones[tone] || tones.brand}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>
            {trend !== undefined && trend !== null && (
                <p className={`text-xs font-semibold mt-3 ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trendUp ? '▲' : '▼'} {Math.abs(trend)}%
                    <span className="text-ink-faint font-normal"> vs last period</span>
                </p>
            )}
        </GlassCard>
    )
}

/**
 * EmptyState — consistent zero-data view.
 */
export const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
        {Icon && (
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-surface-2 text-ink-faint mb-4">
                <Icon className="w-7 h-7" />
            </div>
        )}
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description && <p className="text-sm text-ink-soft mt-1 max-w-sm">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
)

/**
 * Skeleton — shimmering placeholder.
 */
export const Skeleton = ({ className = '', rounded = 'rounded-lg' }) => (
    <div className={`animate-pulse bg-surface-2 ${rounded} ${className}`} />
)

export const SkeletonCard = ({ lines = 3 }) => (
    <GlassCard hoverEffect={false} padding="p-5">
        <Skeleton className="h-4 w-1/3 mb-4" />
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className={`h-3 mb-2 ${i % 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
    </GlassCard>
)

/**
 * DataTable — light, sortable-ready table shell.
 * columns: [{ key, header, render?(row), className?, align? }]
 */
export const DataTable = ({ columns = [], rows = [], rowKey = 'id', onRowClick, empty, className = '' }) => {
    if (!rows.length && empty) return empty
    const alignCls = { left: 'text-left', center: 'text-center', right: 'text-right' }
    return (
        <div className={`glass rounded-2xl overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-line bg-surface-2/60">
                            {columns.map((c) => (
                                <th
                                    key={c.key}
                                    className={`px-4 py-3 font-semibold text-ink-soft text-xs uppercase tracking-wide ${alignCls[c.align] || 'text-left'} ${c.className || ''}`}
                                >
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <motion.tr
                                key={row[rowKey] ?? idx}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={`border-b border-line/70 last:border-0 transition-colors hover:bg-surface-2/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={`px-4 py-3 text-ink ${alignCls[c.align] || 'text-left'} ${c.cellClassName || ''}`}
                                    >
                                        {c.render ? c.render(row) : row[c.key]}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
