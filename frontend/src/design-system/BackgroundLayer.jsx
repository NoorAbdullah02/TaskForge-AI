import React from 'react'
import TaskForgePremiumBackground from './background/TaskForgePremiumBackground.jsx'

export default function BackgroundLayer({ mode = 'subtle', className = '' }) {
    return <TaskForgePremiumBackground mode={mode} className={className} />
}

