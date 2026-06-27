import React from 'react'
import { Toaster } from 'react-hot-toast'

import BackgroundLayer from './BackgroundLayer.jsx'

export default function DSAppShell({
    children,
    showHeader,
    header,
    showCopilot,
    copilot,
    backgroundMode = 'app',
}) {
    return (
        <div className="min-h-screen bg-surface text-ink relative">
            <div className="fixed inset-0 -z-10">
                <BackgroundLayer mode={backgroundMode} />
            </div>

            {showHeader ? header : null}

            <main>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: 'rgba(255,255,255,0.9)',
                            color: '#0b1220',
                            border: '1px solid #e6eaf2',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 12px 40px rgba(16,24,40,0.10)',
                        },
                    }}
                />
                {children}
            </main>

            {showCopilot ? copilot : null}
        </div>
    )
}
