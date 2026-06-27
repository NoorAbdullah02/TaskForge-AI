import React, { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useMotionTemplate, useInView } from 'framer-motion'


export function Spotlight({ children, className = '', color = '37,99,235', size = 380 }) {
    const ref = useRef(null)
    const mx = useMotionValue(-size)
    const my = useMotionValue(-size)

    const onMove = (e) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        mx.set(e.clientX - r.left)
        my.set(e.clientY - r.top)
    }
    const bg = useMotionTemplate`radial-gradient(${size}px circle at ${mx}px ${my}px, rgba(${color},0.12), transparent 70%)`

    return (
        <div ref={ref} onMouseMove={onMove} className={`relative overflow-hidden ${className}`}>
            <motion.div className="pointer-events-none absolute inset-0 z-0" style={{ background: bg }} />
            <div className="relative z-10">{children}</div>
        </div>
    )
}

export function AnimatedGradientBorder({ children, className = '', radius = 18, duration = 6 }) {
    return (
        <div className={`relative p-[1.5px] overflow-hidden ${className}`} style={{ borderRadius: radius }}>
            <motion.div
                className="absolute inset-[-100%]"
                style={{
                    background:
                        'conic-gradient(from 0deg, #2563eb, #7c3aed, #10b981, #2563eb)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative bg-card" style={{ borderRadius: radius - 1 }}>
                {children}
            </div>
        </div>
    )
}

/* 3. ShimmerButton — animated sheen across a brand button */
export function ShimmerButton({ children, onClick, className = '', type = 'button' }) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] transition-transform active:scale-95 ${className}`}
        >
            <span
                className="pointer-events-none absolute inset-0 -translate-x-full"
                style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
                    animation: 'tf-shimmer 2.4s infinite',
                }}
            />
            <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        </button>
    )
}

/* 4. Marquee — infinite horizontal scroller (logos, tags) */
export function Marquee({ children, className = '', speed = 28, reverse = false }) {
    return (
        <div className={`group relative flex overflow-hidden ${className}`}>
            <motion.div
                className="flex shrink-0 gap-8 pr-8"
                animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
                transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
            >
                {children}
                {children}
            </motion.div>
        </div>
    )
}

/* 5. TextGenerate — word-by-word fade-in reveal */
export function TextGenerate({ text = '', className = '', stagger = 0.05 }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-10%' })
    const words = text.split(' ')
    return (
        <span ref={ref} className={className}>
            {words.map((w, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: i * stagger }}
                    className="inline-block"
                >
                    {w}&nbsp;
                </motion.span>
            ))}
        </span>
    )
}

/* 6. NumberTicker — count-up when scrolled into view */
export function NumberTicker({ value = 0, className = '', duration = 1.4, suffix = '', prefix = '' }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true })
    const [n, setN] = useState(0)
    useEffect(() => {
        if (!inView) return
        let raf, start
        const step = (t) => {
            if (!start) start = t
            const p = Math.min((t - start) / (duration * 1000), 1)
            setN(value * (1 - Math.pow(1 - p, 3)))
            if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
    }, [inView, value, duration])
    return (
        <span ref={ref} className={className}>
            {prefix}{Number.isInteger(value) ? Math.round(n).toLocaleString() : n.toFixed(1)}{suffix}
        </span>
    )
}
