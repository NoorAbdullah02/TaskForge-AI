import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

function usePrefersReducedMotionLocal() {
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        if (!mq) return
        const update = () => setReduced(!!mq.matches)
        update()
        if (mq.addEventListener) mq.addEventListener('change', update)
        else mq.addListener(update)
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', update)
            else mq.removeListener(update)
        }
    }, [])

    return reduced
}

function AuroraBeams({ intensity = 1 }) {
    const group = useRef()
    const beams = useMemo(() => {
        return new Array(7).fill(0).map((_, i) => ({
            id: i,
            x: (i - 3) * 2.2,
            hue: 200 + i * 10,
            rot: (i - 3) * 0.12,
            speed: 0.25 + i * 0.03,
        }))
    }, [])

    useFrame(({ clock }) => {
        if (!group.current) return
        const t = clock.elapsedTime
        group.current.rotation.y = Math.sin(t * 0.12) * 0.08
        group.current.rotation.x = Math.cos(t * 0.08) * 0.05

        // Soft breathing scale
        const s = 1 + Math.sin(t * 0.25) * 0.03 * intensity
        group.current.scale.setScalar(s)
    })

    return (
        <group ref={group}>
            {beams.map((b) => (
                <mesh
                    key={b.id}
                    position={[b.x, 0, -10]}
                    rotation={[0, 0, b.rot]}
                    scale={[1, 1.6, 1]}
                >
                    <planeGeometry args={[1.2, 10]} />
                    <meshBasicMaterial
                        color={new THREE.Color(`hsl(${b.hue}, 90%, 65%)`)}
                        transparent
                        opacity={0.06 * intensity}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            ))}
        </group>
    )
}

function GradientMesh() {
    const meshRef = useRef()
    const geometry = useMemo(() => {
        // A low-poly plane with many vertices so we can distort it.
        const geo = new THREE.PlaneGeometry(20, 12, 24, 16)
        geo.rotateX(-Math.PI / 2)
        return geo
    }, [])

    const material = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#2563EB'),
            roughness: 0.35,
            metalness: 0.8,
            emissive: new THREE.Color('#7C3AED'),
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.35,
        })
        return mat
    }, [])

    useFrame(({ clock }) => {
        if (!meshRef.current) return
        const t = clock.elapsedTime
        meshRef.current.rotation.y = t * 0.08
        meshRef.current.position.y = Math.sin(t * 0.15) * 0.25

        // Distort vertices (cheap)
        const pos = meshRef.current.geometry.attributes.position
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const z = pos.getZ(i)
            pos.setY(i, Math.sin(t * 0.65 + x * 0.35 + z * 0.25) * 0.12)
        }
        pos.needsUpdate = true
    })

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} position={[0, 0, 0]} />
    )
}

function ParticleSystem({ count = 1200 }) {
    const pointsRef = useRef()
    const data = useMemo(() => {
        const positions = new Float32Array(count * 3)
        const colors = new Float32Array(count * 3)

        // Deterministic pseudo-random so React purity checks pass.
        const rand = (() => {
            let seed = 1337
            return () => {
                seed = (seed * 1664525 + 1013904223) % 4294967296
                return seed / 4294967296
            }
        })()

        for (let i = 0; i < count; i++) {
            const ix = i * 3
            positions[ix] = (rand() - 0.5) * 28
            positions[ix + 1] = (rand() - 0.5) * 14
            positions[ix + 2] = (rand() - 0.5) * 22

            const t = rand()
            // blue -> purple
            colors[ix] = 0.2 + t * 0.3
            colors[ix + 1] = 0.2 + t * 0.25
            colors[ix + 2] = 0.55 + t * 0.35
        }

        return { positions, colors }
    }, [count])


    useFrame(({ clock }) => {
        if (!pointsRef.current) return
        const t = clock.elapsedTime
        pointsRef.current.rotation.y = t * 0.015
        pointsRef.current.rotation.x = Math.sin(t * 0.12) * 0.08
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" array={data.positions} count={count} itemSize={3} />
                <bufferAttribute attach="attributes-color" array={data.colors} count={count} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation
                depthWrite={false}
            />
        </points>
    )
}

function FloatingBlobs({ reducedMotion }) {
    const hostRef = useRef(null)

    useEffect(() => {
        if (reducedMotion) return
        const el = hostRef.current
        if (!el) return

        const q = gsap.utils.selector(el)
        gsap.set(q('.blob'), { opacity: 0.9 })

        const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut', duration: 2.6 } })
        tl.to(q('.blob1'), { x: 18, y: -14, scale: 1.06 }, 0)
            .to(q('.blob2'), { x: -20, y: 16, scale: 1.05 }, 0)
            .to(q('.blob3'), { x: 12, y: 18, scale: 1.04 }, 0)
            .to(q('.blob1'), { x: 0, y: 0, scale: 1 }, 2.6)
            .to(q('.blob2'), { x: 0, y: 0, scale: 1 }, 2.6)
            .to(q('.blob3'), { x: 0, y: 0, scale: 1 }, 2.6)

        return () => tl.kill()
    }, [reducedMotion])

    return (
        <div ref={hostRef} className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="blob blob1 absolute top-20 left-10 w-64 h-64 rounded-full blur-3xl bg-blue-500/15" />
            <div className="blob blob2 absolute top-1/2 right-16 w-72 h-72 rounded-full blur-3xl bg-purple-500/15" />
            <div className="blob blob3 absolute bottom-10 left-1/2 w-80 h-80 rounded-full blur-3xl bg-emerald-500/10" />
        </div>
    )
}

export default function TaskForgePremiumBackground({
    mode = 'subtle', // 'hero' | 'subtle'
    className = '',
}) {
    const reducedMotion = usePrefersReducedMotionLocal()
    const density = mode === 'hero' ? 1600 : 900

    return (
        <div
            className={`relative ${className}`}
            style={{
                minHeight: '100%',
            }}
        >
            {/* Lightweight HTML overlays (GSAP blobs + aurora beams) */}
            <FloatingBlobs reducedMotion={reducedMotion} />

            {/* 3D Canvas */}
            <div className="absolute inset-0 -z-10">
                <Canvas
                    camera={{ position: [0, 6, 16], fov: 50 }}
                    dpr={reducedMotion ? 1 : [1, 1.6]}
                    gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
                >
                    <Suspense fallback={null}>
                        <ambientLight intensity={0.35} />
                        <pointLight position={[10, 10, 10]} intensity={0.6} color="#7C3AED" />
                        <pointLight position={[-10, -5, -10]} intensity={0.45} color="#2563EB" />

                        {!reducedMotion && <GradientMesh />}
                        <ParticleSystem count={density} />
                        <AuroraBeams intensity={mode === 'hero' ? 1.2 : 1} />
                    </Suspense>
                </Canvas>
            </div>

            {/* Grid + noise + mouse glow layer */}
            <div className="absolute inset-0 -z-1 pointer-events-none">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,58,237,0.07) 1px, transparent 1px)',
                        backgroundSize: '56px 56px',
                        maskImage: 'radial-gradient(circle at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0) 72%)',
                    }}
                />

                {/* Procedural noise (CSS) */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'url("data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Cfilter id="n" x="0%25" y="0%25"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="120" height="120" filter="url(%23n)" opacity="0.22"/%3E%3C/svg%3E")',

                        backgroundSize: '220px 220px',
                        opacity: 0.6,
                        mixBlendMode: 'overlay',
                    }}
                />

                {/* Mouse glow: kept static for perf; will be enhanced later with requestAnimationFrame */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(600px circle at 50% 25%, rgba(37,99,235,0.14), transparent 55%), radial-gradient(520px circle at 70% 60%, rgba(124,58,237,0.12), transparent 58%)',
                    }}
                />
            </div>

            {/* Glass blur overlays to unify with premium SaaS feel */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 left-1/2 w-[720px] h-[420px] -translate-x-1/2 bg-white/5 blur-3xl rounded-full" />
                <div className="absolute top-40 right-[-160px] w-[520px] h-[520px] bg-blue-500/10 blur-3xl rounded-full" />
            </div>
        </div>
    )
}

