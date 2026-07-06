import React, { memo } from 'react'
import { Toaster } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import BackgroundLayer from './BackgroundLayer.jsx'

const DSAppShell = memo(function DSAppShell({
  children,
  showHeader,
  header,
  showCopilot,
  copilot,
  backgroundMode = 'app',
}) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface text-ink relative">
      {/* Fixed background — never re-mounts, stays composited */}
      <div className="fixed inset-0 -z-10">
        <BackgroundLayer mode={backgroundMode} />
      </div>

      {showHeader ? header : null}

      {/* key = pathname so each route gets the fade-in animation */}
      <main key={location.pathname} className="page-enter">
        <Toaster
          position="top-right"
          containerStyle={{ top: 72, zIndex: 99999 }} /* always above every modal/overlay */
          toastOptions={{
            duration: 3500,
            style: {
              background: 'rgba(255,255,255,0.97)',
              color: '#0b1220',
              border: '1px solid #e6eaf2',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 30px rgba(16,24,40,0.08)',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '12px',
              padding: '10px 14px',
            },
          }}
        />
        {children}
      </main>

      {showCopilot ? copilot : null}
    </div>
  )
})

export default DSAppShell
