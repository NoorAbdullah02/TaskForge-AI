import React from 'react'
import { Toaster } from 'react-hot-toast'

import BackgroundLayer from './BackgroundLayer.jsx'

export default function DSAppShell({
    children,
    showHeader,
    header,
    showCopilot,
    copilot,
    backgroundMode,
}) {
    return (
        <div className="min-h-screen bg-base-100 relative">
            <div className="absolute inset-0 -z-10">
                <BackgroundLayer mode={backgroundMode} />
            </div>

            {showHeader ? header : null}

            <main>
                <Toaster position="top-right" />
                {children}
            </main>

            {showCopilot ? copilot : null}
        </div>
    )
}

