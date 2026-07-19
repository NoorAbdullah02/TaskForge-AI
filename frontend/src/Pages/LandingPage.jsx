import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
    ArrowRight, CheckCircle, Sparkles, Code, Cpu, Star, Play,
    Users, TrendingUp, BarChart3, Brain, Layers, Shield, Bell, Zap
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const P = {
    bg: '#ffffff',
    bg2: '#f8faff',
    bg3: '#f0f4ff',
    border: 'rgba(99,102,241,0.12)',
    ink: '#0f172a',
    inkSoft: '#475569',
    inkFaint: '#94a3b8',
    brand: '#6366f1',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
};

// ─── Three.js scene (light) ────────────────────────────────────────────────

function LightOrb({ position, color, scale = 1, speed = 1, distort = 0.35 }) {
    const mesh = useRef();
    useFrame((s) => {
        if (!mesh.current) return;
        mesh.current.rotation.x = s.clock.elapsedTime * 0.08 * speed;
        mesh.current.rotation.y = s.clock.elapsedTime * 0.12 * speed;
    });
    return (
        <Float speed={speed * 1.4} rotationIntensity={0.3} floatIntensity={1}>
            <mesh ref={mesh} position={position} scale={scale}>
                <icosahedronGeometry args={[1, 4]} />
                <MeshDistortMaterial
                    color={color}
                    distort={distort}
                    speed={1.8}
                    roughness={0.05}
                    metalness={0.4}
                    transparent
                    opacity={0.18}
                />
            </mesh>
        </Float>
    );
}

function LightParticles({ count = 140 }) {
    const points = useRef();
    const { positions, colors } = useMemo(() => {
        const palette = [
            new THREE.Color('#6366f1'),
            new THREE.Color('#8b5cf6'),
            new THREE.Color('#3b82f6'),
            new THREE.Color('#06b6d4'),
            new THREE.Color('#10b981'),
        ];
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 22;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
            const c = palette[Math.floor(Math.random() * palette.length)];
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        return { positions: pos, colors: col };
    }, [count]);

    useFrame((s) => {
        if (!points.current) return;
        points.current.rotation.y = s.clock.elapsedTime * 0.018;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.04} vertexColors sizeAttenuation transparent opacity={0.55} />
        </points>
    );
}

function HeroSceneLight() {
    return (
        <>
            <ambientLight intensity={1.2} />
            <directionalLight position={[6, 8, 4]} intensity={1.5} color="#6366f1" />
            <directionalLight position={[-6, -4, -4]} intensity={0.8} color="#06b6d4" />

            <LightOrb position={[4, 1.5, -3]} color="#6366f1" scale={1.4} speed={0.7} distort={0.5} />
            <LightOrb position={[-4, -1, -4]} color="#06b6d4" scale={1} speed={1.1} distort={0.3} />
            <LightOrb position={[1.5, -2.5, -2]} color="#8b5cf6" scale={0.7} speed={1.4} distort={0.6} />
            <LightOrb position={[-2, 3, -5]} color="#10b981" scale={0.8} speed={0.6} distort={0.4} />

            <Float speed={0.8} floatIntensity={0.4}>
                <mesh position={[-5, 0.5, -6]} rotation={[0.3, 0.5, 0.2]}>
                    <torusGeometry args={[1, 0.28, 16, 32]} />
                    <meshStandardMaterial color="#6366f1" wireframe transparent opacity={0.12} />
                </mesh>
            </Float>

            <Float speed={0.6} floatIntensity={0.6}>
                <mesh position={[5.5, -2, -7]} rotation={[0.5, 0.2, 0.8]}>
                    <torusKnotGeometry args={[0.7, 0.18, 80, 16]} />
                    <meshStandardMaterial color="#8b5cf6" wireframe transparent opacity={0.1} />
                </mesh>
            </Float>

            <LightParticles count={160} />
        </>
    );
}

// ─── Micro components ──────────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = '', decimals = 0 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    useEffect(() => {
        if (!inView) return;
        const obj = { val: 0 };
        gsap.to(obj, {
            val: target, duration: 2.4, ease: 'power2.out',
            onUpdate: () => setCount(decimals ? +obj.val.toFixed(decimals) : Math.floor(obj.val)),
        });
    }, [inView, target, decimals]);
    return <span ref={ref}>{typeof count === 'number' ? count.toLocaleString() : count}{suffix}</span>;
}

// Infinite marquee
function Marquee({ items }) {
    return (
        <div className="relative overflow-hidden py-5">
            <div className="absolute inset-y-0 left-0 w-28 z-10 pointer-events-none"
                style={{ background: `linear-gradient(to right, ${P.bg2}, transparent)` }} />
            <div className="absolute inset-y-0 right-0 w-28 z-10 pointer-events-none"
                style={{ background: `linear-gradient(to left, ${P.bg2}, transparent)` }} />
            <div className="flex" style={{ animation: 'lp-marquee 30s linear infinite' }}>
                {[...items, ...items].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 mx-10 shrink-0 group cursor-default"
                        style={{ color: P.inkFaint }}>
                        <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                        <span className="text-sm font-semibold tracking-wide uppercase whitespace-nowrap group-hover:text-indigo-600 transition-colors">
                            {item.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 3-D tilt card with spring physics
function TiltCard({ children, className = '' }) {
    const ref = useRef(null);
    const rotX = useMotionValue(0);
    const rotY = useMotionValue(0);
    const sX = useSpring(rotX, { stiffness: 130, damping: 22 });
    const sY = useSpring(rotY, { stiffness: 130, damping: 22 });
    const onMove = useCallback((e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        rotX.set(-((e.clientY - r.top) / r.height - 0.5) * 14);
        rotY.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    }, [rotX, rotY]);
    const onLeave = useCallback(() => { rotX.set(0); rotY.set(0); }, [rotX, rotY]);
    return (
        <motion.div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{ rotateX: sX, rotateY: sY, transformStyle: 'preserve-3d', perspective: 900 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Gradient headline text
const G = ({ children, from = '#6366f1', to = '#8b5cf6' }) => (
    <span style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    }}>{children}</span>
);

// Pill badge
const Pill = ({ icon: Icon, children, color = '#6366f1', bg = 'rgba(99,102,241,0.08)', border = 'rgba(99,102,241,0.2)' }) => (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
        style={{ background: bg, border: `1px solid ${border}`, color }}>
        {Icon && <Icon className="w-4 h-4" />}{children}
    </div>
);

// ─── Data ──────────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: Brain, title: 'Mistral AI Copilot',
        desc: 'Generate sprint tasks, summarise meetings, predict deadlines, and detect team burnout — all via Mistral AI.',
        from: '#6366f1', to: '#8b5cf6', badge: 'AI', glow: 'rgba(99,102,241,0.15)'
    },
    {
        icon: Layers, title: 'Kanban & Sprints',
        desc: 'Drag-and-drop boards, sprint planning, epic tracking, and story points — a full Agile toolset in one place.',
        from: '#3b82f6', to: '#06b6d4', badge: 'Core', glow: 'rgba(59,130,246,0.15)'
    },
    {
        icon: BarChart3, title: 'Role-Based Dashboards',
        desc: 'Live Recharts dashboards for every role — burndown, velocity, attendance heat maps, and radar charts.',
        from: '#10b981', to: '#06b6d4', badge: 'Insights', glow: 'rgba(16,185,129,0.15)'
    },
    {
        icon: Shield, title: 'Enterprise Security',
        desc: 'JWT + refresh tokens, 2FA via email OTP, workspace role hierarchy, owner-approval flow, and full audit logs.',
        from: '#f43f5e', to: '#f97316', badge: 'Security', glow: 'rgba(244,63,94,0.15)'
    },
    {
        icon: Bell, title: 'Real-time Notifications',
        desc: 'Socket.IO events, BullMQ mail queue, Brevo transactional email — every update reaches the right person.',
        from: '#f59e0b', to: '#f97316', badge: 'Live', glow: 'rgba(245,158,11,0.15)'
    },
    {
        icon: Users, title: 'Team Management',
        desc: 'Owner approval flow, PM assignment, bulk actions, leave requests, attendance tracking, and QR check-in.',
        from: '#8b5cf6', to: '#6366f1', badge: 'Teams', glow: 'rgba(139,92,246,0.15)'
    },
];

const STATS = [
    { value: 10000, suffix: '+', label: 'Tasks Managed', icon: CheckCircle, color: '#10b981' },
    { value: 99.9, suffix: '%', label: 'Uptime SLA', icon: TrendingUp, color: '#6366f1', decimals: 1 },
    { value: 500, suffix: '+', label: 'Active Teams', icon: Users, color: '#8b5cf6' },
    { value: 48, suffix: 'ms', label: 'Avg Response', icon: Zap, color: '#f59e0b' },
];

const TECH = [
    { name: 'PostgreSQL', icon: '🐘' }, { name: 'TypeScript', icon: '💎' },
    { name: 'Mistral AI', icon: '🤖' }, { name: 'React 19', icon: '⚛️' },
    { name: 'Drizzle ORM', icon: '🗄️' }, { name: 'Socket.IO', icon: '⚡' },
    { name: 'BullMQ', icon: '📬' }, { name: 'Redis', icon: '🔴' },
    { name: 'ImageKit', icon: '🖼️' }, { name: 'Brevo', icon: '✉️' },
    { name: 'Three.js', icon: '🌐' }, { name: 'GSAP', icon: '✨' },
];

const TESTIMONIALS = [
    {
        name: 'Sarah Chen', role: 'Engineering Lead @ Nexus', avatar: 'SC', from: '#6366f1', to: '#8b5cf6',
        text: 'The AI task generator alone saved us 4 hours of sprint planning every week. Kanban board is buttery smooth.'
    },
    {
        name: 'Marcus Ali', role: 'Product Manager @ Veritas', avatar: 'MA', from: '#3b82f6', to: '#06b6d4',
        text: 'Finally one tool for project management, attendance, and leave tracking. No more juggling five apps.'
    },
    {
        name: 'Priya Sharma', role: 'Full-Stack Dev @ Apex', avatar: 'PS', from: '#10b981', to: '#06b6d4',
        text: 'Clean TypeScript + Drizzle ORM codebase. Role-based dashboards are exactly what our team needed.'
    },
    {
        name: 'James Okafor', role: 'CTO @ BuildFlow', avatar: 'JO', from: '#f43f5e', to: '#f97316',
        text: 'The burnout-detection AI flagged an overloaded team member we had completely missed. Incredible product.'
    },
];

const BENTO = [
    {
        span: 'lg:col-span-2', color: '#6366f1', bg: 'rgba(99,102,241,0.05)', border: 'rgba(99,102,241,0.15)',
        icon: Brain, label: 'AI Copilot', title: 'Your intelligent workspace assistant',
        desc: 'Generate sprint tasks from a description, summarise meetings, detect team burnout, and get smart answers — all via Mistral AI.',
        preview: (
            <div className="flex flex-col gap-2 max-w-sm mt-2">
                <div className="self-end rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium text-white"
                    style={{ background: '#6366f1' }}>
                    Generate tasks for a mobile checkout flow
                </div>
                <div className="self-start rounded-2xl rounded-bl-md px-4 py-2.5 text-sm"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#475569' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span className="text-xs text-indigo-600 font-semibold">Mistral AI</span>
                    </div>
                    Created 14 tasks with subtasks, assigned priorities &amp; estimated a 3-week sprint ✨
                </div>
            </div>
        ),
    },
    {
        span: '', color: '#3b82f6', bg: 'rgba(59,130,246,0.04)', border: 'rgba(59,130,246,0.14)',
        icon: Layers, label: 'Kanban', title: 'Drag & Drop Boards',
        desc: 'Optimistic updates with instant server rollback on error.',
        preview: (
            <div className="flex gap-2 mt-3">
                {['Todo', 'Doing', 'Done'].map((col, ci) => (
                    <div key={ci} className="flex-1 rounded-xl p-2"
                        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                        <p className="text-[10px] font-bold mb-2" style={{ color: '#94a3b8' }}>{col}</p>
                        {[...Array(3 - ci)].map((_, j) => (
                            <div key={j} className="h-5 rounded mb-1.5 last:mb-0"
                                style={{ background: 'rgba(59,130,246,0.1)' }} />
                        ))}
                    </div>
                ))}
            </div>
        ),
    },
    {
        span: '', color: '#10b981', bg: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.14)',
        icon: CheckCircle, label: 'Attendance', title: 'Track Presence',
        desc: 'One-click check-in/out with QR code support and monthly reports.',
        preview: (
            <div className="flex items-end gap-1.5 h-16 mt-3">
                {[55, 78, 92, 68, 95, 88, 91].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t"
                        style={{ height: `${h}%`, background: `rgba(16,185,129,${0.25 + h / 280})` }} />
                ))}
            </div>
        ),
    },
    {
        span: 'lg:col-span-2', color: '#f43f5e', bg: 'rgba(244,63,94,0.04)', border: 'rgba(244,63,94,0.14)',
        icon: BarChart3, label: 'Analytics', title: 'Real-time analytics that matter',
        desc: 'Burndown charts, velocity trends, attendance heat maps and team radar — rendered live with Recharts.',
        preview: (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                    { label: 'Active Projects', value: '12', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'Total Tasks', value: '248', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                    { label: 'Attendance', value: '94%', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
                    { label: 'Productivity', value: '↑ 23%', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                ].map((m, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: m.bg }}>
                        <p className="text-[11px] mb-1" style={{ color: '#94a3b8' }}>{m.label}</p>
                        <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                    </div>
                ))}
            </div>
        ),
    },
];

// ─── Main ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const heroRef = useRef(null);
    const featuresRef = useRef(null);
    const statsRef = useRef(null);
    const [activeTesti, setActiveTesti] = useState(0);

    // Auto-rotate testimonials
    useEffect(() => {
        const t = setInterval(() => setActiveTesti(p => (p + 1) % TESTIMONIALS.length), 4500);
        return () => clearInterval(t);
    }, []);

    // Hero entrance
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.timeline({ delay: 0.15 })
                .from('.lp-badge', { opacity: 0, y: 22, duration: 0.7, ease: 'power3.out' })
                .from('.lp-title', { opacity: 0, y: 46, duration: 0.9, ease: 'power3.out' }, '-=0.35')
                .from('.lp-sub', { opacity: 0, y: 26, duration: 0.7, ease: 'power3.out' }, '-=0.4')
                .from('.lp-btns', { opacity: 0, y: 22, duration: 0.7, ease: 'power3.out' }, '-=0.35')
                .from('.lp-metrics', { opacity: 0, y: 18, duration: 0.6, ease: 'power3.out' }, '-=0.3')
                .from('.lp-mockup', { opacity: 0, scale: 0.93, duration: 1, ease: 'power2.out' }, '-=0.75');
        }, heroRef);
        return () => ctx.revert();
    }, []);

    // Scroll animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.feat-card', {
                scrollTrigger: { trigger: featuresRef.current, start: 'top 78%' },
                opacity: 0, y: 56, stagger: 0.09, duration: 0.8, ease: 'power3.out',
            });
            gsap.from('.stat-item', {
                scrollTrigger: { trigger: statsRef.current, start: 'top 82%' },
                opacity: 0, y: 36, scale: 0.9, stagger: 0.11, duration: 0.7, ease: 'back.out(1.6)',
            });
        });
        return () => ctx.revert();
    }, []);

    // card styles helper
    const card = (bg = P.bg, border = P.border) => ({
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: '0 4px 24px rgba(99,102,241,0.06)',
    });

    return (
        <div style={{ background: P.bg, color: P.ink, overflowX: 'hidden' }}>

            {/* ── HERO ─────────────────────────────────────────────── */}
            <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden"
                style={{ background: `linear-gradient(160deg, #ffffff 0%, #f0f4ff 60%, #ede9fe 100%)` }}>

                {/* Three.js canvas */}
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [0, 0, 7], fov: 65 }} gl={{ antialias: true, alpha: true }}>
                        <Suspense fallback={null}><HeroSceneLight /></Suspense>
                    </Canvas>
                </div>

                {/* Soft radial glow */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />

                {/* Content */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-20 grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        {/* Badge */}
                        <div className="lp-badge">
                            <Pill icon={Sparkles} color="#6366f1" bg="rgba(99,102,241,0.08)" border="rgba(99,102,241,0.2)">
                                AI · Socket.IO · Drizzle ORM
                            </Pill>
                        </div>

                        {/* Headline */}
                        <h1 className="lp-title text-5xl sm:text-6xl lg:text-[4.4rem] font-black leading-[1.05] tracking-tight mb-6">
                            The AI workspace{' '}
                            <br className="hidden sm:block" />
                            <G from="#6366f1" to="#8b5cf6">teams ship with</G>
                        </h1>

                        <p className="lp-sub text-lg sm:text-xl mb-10 leading-relaxed max-w-xl"
                            style={{ color: P.inkSoft }}>
                            TaskForge AI unifies tasks, sprints, attendance, leaves, and real-time AI intelligence in one beautiful platform. Built for modern engineering teams.
                        </p>

                        <div className="lp-btns flex flex-wrap gap-4 mb-14">
                            <Link to="/register">
                                <motion.div
                                    whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-base text-white cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.25)' }}
                                >
                                    Get Started Free <ArrowRight className="w-4 h-4" />
                                </motion.div>
                            </Link>
                            <Link to="/login">
                                <motion.div
                                    whileHover={{ scale: 1.04, background: 'rgba(99,102,241,0.07)' }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-base cursor-pointer transition-colors"
                                    style={{ background: '#ffffff', border: `1px solid ${P.border}`, color: P.inkSoft, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                                >
                                    <Play className="w-4 h-4" /> Live Demo
                                </motion.div>
                            </Link>
                        </div>

                        <div className="lp-metrics flex flex-wrap gap-10">
                            {[
                                { value: '10K+', label: 'Tasks Managed' },
                                { value: '99.9%', label: 'Uptime' },
                                { value: '500+', label: 'Teams' },
                            ].map((m, i) => (
                                <div key={i}>
                                    <div className="text-3xl font-black" style={{ color: P.ink }}>{m.value}</div>
                                    <div className="text-sm mt-1" style={{ color: P.inkFaint }}>{m.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product mockup */}
                    <div className="lp-mockup relative hidden lg:block">
                        <motion.div
                            animate={{ y: [0, -14, 0] }}
                            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                            className="rounded-3xl overflow-hidden"
                            style={{
                                background: 'rgba(255,255,255,0.85)',
                                border: '1px solid rgba(99,102,241,0.14)',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 32px 80px rgba(99,102,241,0.12), 0 8px 32px rgba(0,0,0,0.06)',
                            }}
                        >
                            {/* Title bar */}
                            <div className="flex items-center gap-2 px-4 py-3"
                                style={{ borderBottom: `1px solid ${P.border}`, background: 'rgba(240,244,255,0.8)' }}>
                                <span className="w-3 h-3 rounded-full bg-red-400" />
                                <span className="w-3 h-3 rounded-full bg-amber-400" />
                                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                <span className="ml-3 text-xs font-semibold" style={{ color: P.inkFaint }}>
                                    TaskForge AI · Sprint Board
                                </span>
                            </div>
                            {/* Columns */}
                            <div className="p-4 grid grid-cols-3 gap-3">
                                {[
                                    { col: 'Backlog', color: '#94a3b8', tasks: 3 },
                                    { col: 'In Progress', color: '#6366f1', tasks: 2 },
                                    { col: 'Done', color: '#10b981', tasks: 4 },
                                ].map((k, i) => (
                                    <div key={i} className="rounded-xl p-3"
                                        style={{ background: P.bg2, border: `1px solid ${P.border}` }}>
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <span className="w-2 h-2 rounded-full" style={{ background: k.color }} />
                                            <span className="text-[10px] font-bold" style={{ color: P.inkFaint }}>{k.col}</span>
                                        </div>
                                        {[...Array(k.tasks)].map((_, j) => (
                                            <div key={j} className="rounded-lg p-2 mb-2 last:mb-0 bg-white"
                                                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${P.border}` }}>
                                                <div className="h-1.5 rounded mb-1.5 w-3/4" style={{ background: P.bg3 }} />
                                                <div className="h-1.5 rounded w-1/2" style={{ background: P.bg3 }} />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            {/* AI strip */}
                            <div className="px-4 pb-4">
                                <div className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                    <Brain className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span className="text-xs" style={{ color: P.inkSoft }}>
                                        <span className="text-indigo-600 font-semibold">AI: </span>
                                        Velocity ↑ 23% · 2 tasks at risk · 1 member near burnout
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Sprint chip */}
                        <motion.div className="absolute -right-8 top-6"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                            <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
                                style={{
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: '0 8px 24px rgba(16,185,129,0.12)',
                                }}>
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-emerald-700">Sprint Completed</p>
                                    <p className="text-[10px]" style={{ color: P.inkFaint }}>18 / 20 tasks done</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* AI chip */}
                        <motion.div className="absolute -left-8 bottom-8"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
                            <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
                                style={{
                                    background: 'rgba(139,92,246,0.08)',
                                    border: '1px solid rgba(139,92,246,0.22)',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: '0 8px 24px rgba(139,92,246,0.12)',
                                }}>
                                <Sparkles className="w-4 h-4 text-violet-500" />
                                <div>
                                    <p className="text-[11px] font-bold text-violet-700">AI generated 12 tasks ✨</p>
                                    <p className="text-[10px]" style={{ color: P.inkFaint }}>from your PRD description</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom separator line */}
                <div className="absolute bottom-0 inset-x-0 h-px"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.3), transparent)' }} />
            </section>

            {/* ── MARQUEE ──────────────────────────────────────────── */}
            <section style={{ background: P.bg2, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}` }}>
                <p className="text-center text-xs font-bold uppercase tracking-[0.3em] pt-6 pb-2"
                    style={{ color: P.inkFaint }}>Built with battle-tested technologies</p>
                <Marquee items={TECH} />
            </section>

            {/* ── FEATURES ─────────────────────────────────────────── */}
            <section ref={featuresRef} className="relative py-32" style={{ background: P.bg }}>
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)' }} />

                <div className="max-w-7xl mx-auto px-6">
                    <motion.div className="text-center mb-16"
                        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }} viewport={{ once: true }}>
                        <Pill icon={Code} color="#6366f1">Everything Included</Pill>
                        <h2 className="text-4xl sm:text-5xl font-black mb-5 leading-tight" style={{ color: P.ink }}>
                            Engineered for{' '}
                            <G from="#6366f1" to="#06b6d4">speed &amp; scale</G>
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: P.inkSoft }}>
                            A complete enterprise project management suite with AI intelligence, real-time collaboration, and beautiful analytics.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <TiltCard key={i} className="feat-card h-full">
                                    <motion.div
                                        whileHover={{ boxShadow: `0 12px 40px ${f.glow}, 0 2px 8px rgba(0,0,0,0.04)`, borderColor: f.from + '40', y: -3 }}
                                        className="h-full rounded-2xl p-7 bg-white transition-all duration-300 cursor-default"
                                        style={card()}
                                    >
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                style={{ background: `linear-gradient(135deg, ${f.from}, ${f.to})`, boxShadow: `0 4px 16px ${f.glow}` }}>
                                                <Icon className="w-6 h-6 text-white" />
                                            </div>
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                                style={{ background: f.from + '12', color: f.from, border: `1px solid ${f.from}28` }}>
                                                {f.badge}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-3" style={{ color: P.ink }}>{f.title}</h3>
                                        <p className="text-sm leading-relaxed" style={{ color: P.inkSoft }}>{f.desc}</p>
                                    </motion.div>
                                </TiltCard>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── STATS ────────────────────────────────────────────── */}
            <section ref={statsRef} className="py-24" style={{ background: P.bg2 }}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        {STATS.map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <div key={i} className="stat-item text-center rounded-2xl py-8 px-4 bg-white"
                                    style={card()}>
                                    <Icon className="w-6 h-6 mx-auto mb-3" style={{ color: s.color }} />
                                    <div className="text-4xl font-black mb-1.5" style={{ color: s.color }}>
                                        <AnimatedCounter target={s.value} suffix={s.suffix} decimals={s.decimals} />
                                    </div>
                                    <div className="text-sm font-semibold" style={{ color: P.inkFaint }}>{s.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── BENTO SHOWCASE ───────────────────────────────────── */}
            <section className="py-32" style={{ background: P.bg }}>
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div className="text-center mb-16"
                        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }} viewport={{ once: true }}>
                        <h2 className="text-4xl sm:text-5xl font-black mb-5 leading-tight" style={{ color: P.ink }}>
                            Designed for{' '}
                            <G from="#10b981" to="#06b6d4">modern teams</G>
                        </h2>
                        <p className="text-lg max-w-xl mx-auto" style={{ color: P.inkSoft }}>
                            Every feature built with real-world engineering workflows in mind.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BENTO.map((b, i) => {
                            const Icon = b.icon;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: i * 0.08 }} viewport={{ once: true }}
                                    className={`rounded-3xl p-7 relative overflow-hidden ${b.span}`}
                                    style={{ background: b.bg, border: `1px solid ${b.border}`, minHeight: 220 }}
                                >
                                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none"
                                        style={{ background: `radial-gradient(circle, ${b.color}14, transparent 70%)` }} />
                                    <div className="flex items-center gap-3 mb-4 relative z-10">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: b.color + '18' }}>
                                            <Icon className="w-5 h-5" style={{ color: b.color }} />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest"
                                            style={{ color: b.color }}>{b.label}</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 relative z-10" style={{ color: P.ink }}>{b.title}</h3>
                                    <p className="text-sm relative z-10" style={{ color: P.inkSoft }}>{b.desc}</p>
                                    <div className="relative z-10">{b.preview}</div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ─────────────────────────────────────── */}
            <section className="py-32" style={{ background: P.bg2 }}>
                <div className="max-w-4xl mx-auto px-6">
                    <motion.div className="text-center mb-14"
                        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }} viewport={{ once: true }}>
                        <h2 className="text-4xl sm:text-5xl font-black mb-4" style={{ color: P.ink }}>
                            Loved by{' '}
                            <G from="#f59e0b" to="#f43f5e">builders</G>
                        </h2>
                        <p style={{ color: P.inkSoft }}>See what engineering teams are saying</p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeTesti}
                            initial={{ opacity: 0, y: 18, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -18, scale: 0.98 }}
                            transition={{ duration: 0.45 }}
                            className="rounded-3xl p-10 text-center mb-8 bg-white"
                            style={card()}>
                            <div className="flex justify-center gap-1 mb-6">
                                {[...Array(5)].map((_, j) => (
                                    <Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-xl font-medium mb-8 leading-relaxed max-w-2xl mx-auto"
                                style={{ color: P.inkSoft }}>
                                "{TESTIMONIALS[activeTesti].text}"
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                    style={{ background: `linear-gradient(135deg, ${TESTIMONIALS[activeTesti].from}, ${TESTIMONIALS[activeTesti].to})` }}>
                                    {TESTIMONIALS[activeTesti].avatar}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm" style={{ color: P.ink }}>{TESTIMONIALS[activeTesti].name}</p>
                                    <p className="text-xs" style={{ color: P.inkFaint }}>{TESTIMONIALS[activeTesti].role}</p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-2">
                        {TESTIMONIALS.map((_, i) => (
                            <button key={i} onClick={() => setActiveTesti(i)}
                                className="rounded-full transition-all duration-300"
                                style={{
                                    width: i === activeTesti ? 28 : 8, height: 8,
                                    background: i === activeTesti ? '#6366f1' : 'rgba(99,102,241,0.2)',
                                }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────── */}
            <section className="py-32 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, #f0f4ff 0%, #ede9fe 50%, #e0f2fe 100%)` }}>
                {/* Subtle grid */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
                                          linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px)`,
                        backgroundSize: '56px 56px',
                    }} />

                {/* Soft blobs */}
                <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)', filter: 'blur(50px)' }} />
                <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)', filter: 'blur(50px)' }} />

                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }} viewport={{ once: true }}>
                        <Pill icon={Cpu} color="#10b981" bg="rgba(16,185,129,0.08)" border="rgba(16,185,129,0.25)">
                            Free to get started · No credit card
                        </Pill>
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{ color: P.ink }}>
                            Ready to{' '}
                            <G from="#6366f1" to="#06b6d4">ship faster?</G>
                        </h2>
                        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: P.inkSoft }}>
                            Join hundreds of engineering teams using TaskForge AI to manage projects, track attendance, and leverage AI for every sprint.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/register">
                                <motion.div
                                    whileHover={{ scale: 1.05, boxShadow: '0 12px 36px rgba(99,102,241,0.3)' }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.25)' }}>
                                    Start Building — It's Free <ArrowRight className="w-5 h-5" />
                                </motion.div>
                            </Link>
                            <Link to="/login">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg cursor-pointer"
                                    style={{ background: '#ffffff', border: `1px solid ${P.border}`, color: P.inkSoft, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                    <Play className="w-5 h-5" /> View Demo
                                </motion.div>
                            </Link>
                        </div>
                        <p className="text-sm mt-6" style={{ color: P.inkFaint }}>
                            Setup in 2 minutes &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Cancel anytime
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <footer className="py-16" style={{ background: P.ink, color: 'rgba(255,255,255,0.55)' }}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <h3 className="text-xl font-black mb-3"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                TaskForge AI
                            </h3>
                            <p className="text-sm leading-relaxed">
                                AI-powered project management for modern engineering teams. Ship faster. Collaborate smarter.
                            </p>
                        </div>
                        {[
                            { heading: 'Product', links: ['Features', 'AI Workspace', 'Analytics', 'Integrations'] },
                            { heading: 'Team', links: ['About', 'Blog', 'Careers', 'Contact'] },
                            { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'Status'] },
                        ].map((col, i) => (
                            <div key={i}>
                                <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-white/40">{col.heading}</h4>
                                <ul className="space-y-2.5">
                                    {col.links.map(l => (
                                        <li key={l}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-sm">© 2026 TaskForge AI.   &amp; </p>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            All systems operational
                        </div>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes lp-marquee {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
