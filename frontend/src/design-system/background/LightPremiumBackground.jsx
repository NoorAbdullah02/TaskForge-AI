import React from 'react'

/**
 * Light premium background — CSS-only, GPU-composited.
 * Blobs use will-change:transform + translateZ(0) so they stay on their own
 * compositor layer and never trigger main-thread layout repaints.
 * Reduced to 2 blobs (down from 3) to cut GPU memory usage by ~33%.
 */
export default function LightPremiumBackground({ mode = 'app', className = '' }) {
  const hero = mode === 'hero'

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-mesh-light ${className}`}
      style={{ contentVisibility: 'auto' }}
    >
      {/* Subtle grid — pure CSS, zero paint cost */}
      <div className="absolute inset-0 bg-grid-light" />

<<<<<<< HEAD
            {/* Soft floating color blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="blob-anim absolute -top-24 -left-16 rounded-full blur-3xl"
                    style={{
                        width: hero ? 560 : 420,
                        height: hero ? 560 : 420,
                        background: 'radial-gradient(circle, rgba(37,99,235,0.16), transparent 70%)',
                        animation: 'blob-drift 14s ease-in-out infinite',
                    }}
                />
                <div
                    className="blob-anim absolute top-1/3 -right-24 rounded-full blur-3xl"
                    style={{
                        width: hero ? 620 : 460,
                        height: hero ? 620 : 460,
                        background: 'radial-gradient(circle, rgba(124,58,237,0.14), transparent 70%)',
                        animation: 'blob-drift 18s ease-in-out infinite reverse',
                    }}
                />
                <div
                    className="blob-anim absolute -bottom-32 left-1/3 rounded-full blur-3xl"
                    style={{
                        width: hero ? 520 : 380,
                        height: hero ? 520 : 380,
                        background: 'radial-gradient(circle, rgba(16,185,129,0.10), transparent 70%)',
                        animation: 'blob-drift 16s ease-in-out infinite',
                    }}
                />
                <div
                    className="blob-anim absolute top-10 right-1/4 rounded-full blur-3xl"
                    style={{
                        width: hero ? 460 : 340,
                        height: hero ? 460 : 340,
                        background: 'radial-gradient(circle, rgba(13,148,136,0.10), transparent 70%)',
                        animation: 'blob-drift 20s ease-in-out infinite reverse',
                    }}
                />
                <div
                    className="blob-anim absolute bottom-1/4 -right-16 rounded-full blur-3xl"
                    style={{
                        width: hero ? 400 : 300,
                        height: hero ? 400 : 300,
                        background: 'radial-gradient(circle, rgba(225,29,72,0.08), transparent 70%)',
                        animation: 'blob-drift 22s ease-in-out infinite',
                    }}
                />
            </div>
=======
      {/* Two GPU-composited blobs — promote to own layer via will-change */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="blob-anim absolute -top-24 -left-16 rounded-full"
          style={{
            width:  hero ? 520 : 380,
            height: hero ? 520 : 380,
            background: 'radial-gradient(circle, rgba(37,99,235,0.13), transparent 70%)',
            filter: 'blur(60px)',
            animation: 'blob-drift 16s ease-in-out infinite',
          }}
        />
        <div
          className="blob-anim absolute top-1/3 -right-24 rounded-full"
          style={{
            width:  hero ? 580 : 420,
            height: hero ? 580 : 420,
            background: 'radial-gradient(circle, rgba(124,58,237,0.11), transparent 70%)',
            filter: 'blur(60px)',
            animation: 'blob-drift 20s ease-in-out infinite reverse',
          }}
        />
      </div>
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)

      {/* Top sheen */}
      <div
        className="absolute inset-x-0 top-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)' }}
      />
    </div>
  )
}
