import React, { Suspense, lazy } from 'react'
import LightPremiumBackground from './background/LightPremiumBackground.jsx'

const TaskForgePremiumBackground = lazy(() =>
    import('./background/TaskForgePremiumBackground.jsx')
)

export default function BackgroundLayer({ mode = 'app', className = '' }) {
    if (mode === 'hero3d') {
        return (
            <Suspense fallback={<div className="absolute inset-0 bg-[#070A12]" />}>
                <TaskForgePremiumBackground mode="hero" className={className} />
            </Suspense>
        )
    }

    // Default: light premium (app + auth).
    return <LightPremiumBackground mode={mode} className={className} />
}
