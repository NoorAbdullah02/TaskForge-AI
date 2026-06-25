import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars, Trail, MeshDistortMaterial, Text, Environment } from '@react-three/drei';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import * as THREE from 'three';
import {
    Zap, Shield, BarChart3, Brain, Layers, Globe, ArrowRight,
    CheckCircle, Sparkles, Code, Cpu, Star, ChevronRight, Play
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   THREE.JS COMPONENTS
   ═══════════════════════════════════════════════════════════ */

// Animated particle field
function ParticleField({ count = 2000 }) {
    const mesh = useRef();
    const light = useRef();

    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 25;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 25;

            // Blue to purple gradient colors
            const t = Math.random();
            colors[i * 3] = 0.3 + t * 0.3;     // R
            colors[i * 3 + 1] = 0.3 + t * 0.2;  // G
            colors[i * 3 + 2] = 0.8 + t * 0.2;  // B

            sizes[i] = Math.random() * 2 + 0.5;
        }
        return { positions, colors, sizes };
    }, [count]);

    useFrame((state) => {
        if (!mesh.current) return;
        mesh.current.rotation.y = state.clock.elapsedTime * 0.015;
        mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={particles.positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={particles.colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.04} vertexColors transparent opacity={0.6} sizeAttenuation />
        </points>
    );
}

// AI Brain Core — glowing distorted sphere
function AIBrainCore() {
    const meshRef = useRef();
    const glowRef = useRef();

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.003;
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
        if (glowRef.current) {
            glowRef.current.scale.setScalar(1.4 + Math.sin(state.clock.elapsedTime * 2) * 0.08);
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
            <group>
                {/* Outer glow */}
                <mesh ref={glowRef}>
                    <sphereGeometry args={[1.5, 32, 32]} />
                    <meshBasicMaterial color="#4f46e5" transparent opacity={0.05} />
                </mesh>

                {/* Main brain sphere */}
                <mesh ref={meshRef}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <MeshDistortMaterial
                        color="#6366f1"
                        emissive="#4338ca"
                        emissiveIntensity={0.4}
                        roughness={0.2}
                        metalness={0.8}
                        distort={0.3}
                        speed={2}
                        transparent
                        opacity={0.9}
                    />
                </mesh>

                {/* Inner core */}
                <mesh>
                    <sphereGeometry args={[0.6, 32, 32]} />
                    <meshBasicMaterial color="#818cf8" transparent opacity={0.3} />
                </mesh>

                {/* Orbital rings */}
                {[0, 1, 2].map((i) => (
                    <OrbitalRing key={i} index={i} />
                ))}
            </group>
        </Float>
    );
}

function OrbitalRing({ index }) {
    const ringRef = useRef();
    const rotations = [
        [0, 0, 0],
        [Math.PI / 3, Math.PI / 4, 0],
        [Math.PI / 6, 0, Math.PI / 3]
    ];

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.z += 0.005 * (index + 1);
        }
    });

    return (
        <mesh ref={ringRef} rotation={rotations[index]}>
            <torusGeometry args={[1.4 + index * 0.25, 0.008, 16, 100]} />
            <meshBasicMaterial color="#818cf8" transparent opacity={0.3 - index * 0.08} />
        </mesh>
    );
}

// Floating project nodes around the brain
function FloatingNodes() {
    const nodes = useMemo(() => [
        { pos: [2.5, 1.2, -0.5], color: '#10b981', label: 'Tasks', size: 0.18 },
        { pos: [-2.2, 0.8, 0.8], color: '#3b82f6', label: 'Projects', size: 0.2 },
        { pos: [1.8, -1.5, 1], color: '#f59e0b', label: 'Teams', size: 0.15 },
        { pos: [-1.5, -1.2, -1], color: '#ec4899', label: 'Reports', size: 0.16 },
        { pos: [0.5, 2.2, 1.2], color: '#8b5cf6', label: 'AI', size: 0.22 },
        { pos: [-2.8, -0.3, 0.3], color: '#06b6d4', label: 'Analytics', size: 0.17 },
    ], []);

    return (
        <>
            {nodes.map((node, i) => (
                <FloatingNode key={i} {...node} index={i} />
            ))}
        </>
    );
}

function FloatingNode({ pos, color, label, size, index }) {
    const meshRef = useRef();
    const lineRef = useRef();

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = pos[1] + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.3;
            meshRef.current.position.x = pos[0] + Math.cos(state.clock.elapsedTime * 0.5 + index) * 0.15;
        }
    });

    return (
        <group>
            <Float speed={1.2 + index * 0.2} rotationIntensity={0.2} floatIntensity={0.3}>
                <mesh ref={meshRef} position={pos}>
                    <sphereGeometry args={[size, 32, 32]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.5}
                        roughness={0.3}
                        metalness={0.6}
                    />
                </mesh>
            </Float>
        </group>
    );
}

// Connection lines between nodes
function ConnectionLines() {
    const lineRef = useRef();
    const points = useMemo(() => {
        const pts = [];
        for (let i = 0; i < 50; i++) {
            const theta = (i / 50) * Math.PI * 2;
            pts.push(new THREE.Vector3(
                Math.cos(theta) * 2.5,
                Math.sin(theta * 2) * 0.8,
                Math.sin(theta) * 2.5
            ));
        }
        return pts;
    }, []);

    useFrame((state) => {
        if (lineRef.current) {
            lineRef.current.rotation.y += 0.002;
        }
    });

    return (
        <group ref={lineRef}>
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={points.length}
                        array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#6366f1" transparent opacity={0.15} />
            </line>
        </group>
    );
}

// Hero 3D Scene
function HeroScene() {
    const { viewport } = useThree();

    return (
        <>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.8} color="#6366f1" />
            <pointLight position={[-10, -10, -10]} intensity={0.4} color="#3b82f6" />
            <spotLight position={[0, 10, 0]} intensity={0.5} color="#8b5cf6" angle={0.3} penumbra={1} />

            <ParticleField />
            <AIBrainCore />
            <FloatingNodes />
            <ConnectionLines />
            <Stars radius={80} depth={60} count={1500} factor={3} saturation={0.5} fade speed={0.5} />
        </>
    );
}

/* ═══════════════════════════════════════════════════════════
   REACT COMPONENTS
   ═══════════════════════════════════════════════════════════ */

// Animated counter
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView) {
            const obj = { val: 0 };
            gsap.to(obj, {
                val: target,
                duration: 2,
                ease: 'power2.out',
                onUpdate: () => setCount(Math.floor(obj.val)),
            });
        }
    }, [isInView, target]);

    return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// Gradient text component
const GradientText = ({ children, className = '' }) => (
    <span className={`bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent ${className}`}>
        {children}
    </span>
);

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════ */

const LandingPage = () => {
    const heroRef = useRef(null);
    const featuresRef = useRef(null);
    const { scrollYProgress } = useScroll();
    const bgOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.6]);

    // GSAP page load animation
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, delay: 0.2 });
            gsap.from('.hero-title', { opacity: 0, y: 50, duration: 1, delay: 0.5 });
            gsap.from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.8, delay: 0.9 });
            gsap.from('.hero-buttons', { opacity: 0, y: 30, duration: 0.8, delay: 1.2 });
            gsap.from('.hero-metrics', { opacity: 0, y: 30, duration: 0.8, delay: 1.5 });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    const features = [
        { icon: Zap, title: 'Lightning Fast', description: 'Real-time task updates with optimistic UI. No loading spinners, just instant feedback.', gradient: 'from-amber-500 to-orange-600' },
        { icon: Brain, title: 'AI-Powered', description: 'Gemini AI generates tasks, summarizes meetings, and answers questions about your workspace.', gradient: 'from-purple-500 to-indigo-600' },
        { icon: Layers, title: 'Kanban & Beyond', description: 'Drag-and-drop boards, list views, and timeline views to manage projects your way.', gradient: 'from-blue-500 to-cyan-600' },
        { icon: Shield, title: 'Enterprise Security', description: 'JWT authentication, email verification, and role-based access control built-in.', gradient: 'from-emerald-500 to-teal-600' },
        { icon: BarChart3, title: 'Analytics Dashboard', description: 'Recharts-powered dashboard with attendance tracking, leave stats, and productivity metrics.', gradient: 'from-pink-500 to-rose-600' },
        { icon: Globe, title: 'Cloud Native', description: 'PostgreSQL + Drizzle ORM with ImageKit CDN for global file delivery. Deploy anywhere.', gradient: 'from-indigo-500 to-violet-600' },
    ];

    const integrations = [
        { name: 'PostgreSQL', icon: '🐘' },
        { name: 'ImageKit', icon: '🖼️' },
        { name: 'Gemini AI', icon: '🤖' },
        { name: 'React', icon: '⚛️' },
        { name: 'Node.js', icon: '🟢' },
        { name: 'TypeScript', icon: '💎' },
    ];

    return (
        <div className="bg-[#0a0a0f] text-white overflow-hidden">
            {/* ─── HERO SECTION ────────────────────────────────── */}
            <section ref={heroRef} className="relative min-h-screen flex items-center">
                {/* 3D Canvas Background */}
                <div className="absolute inset-0 z-0">
                    <Canvas
                        camera={{ position: [0, 0, 6], fov: 60 }}
                        dpr={[1, 1.5]}
                        gl={{ antialias: true, alpha: true }}
                    >
                        <Suspense fallback={null}>
                            <HeroScene />
                        </Suspense>
                    </Canvas>
                </div>

                {/* Gradient overlays */}
                <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#0a0a0f]/40 via-transparent to-[#0a0a0f]" />
                <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />

                {/* Hero Content */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-16">
                    <div className="max-w-3xl">
                        {/* Badge */}
                        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm mb-8">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-300">Now with Gemini AI Integration</span>
                            <ChevronRight className="w-4 h-4 text-indigo-400" />
                        </div>

                        {/* Title */}
                        <h1 className="hero-title text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
                            Build faster with{' '}
                            <GradientText>AI-powered</GradientText>
                            {' '}project management
                        </h1>

                        {/* Subtitle */}
                        <p className="hero-subtitle text-lg sm:text-xl text-gray-400 max-w-xl mb-10 leading-relaxed">
                            TaskForge AI brings together tasks, teams, attendance, and AI intelligence
                            in one beautiful workspace. Ship products faster than ever.
                        </p>

                        {/* CTA Buttons */}
                        <div className="hero-buttons flex flex-wrap gap-4 mb-16">
                            <Link
                                to="/register"
                                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg shadow-white/10"
                            >
                                Get Started Free
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 hover:border-white/40 transition-all backdrop-blur-sm"
                            >
                                <Play className="w-4 h-4" />
                                Live Demo
                            </Link>
                        </div>

                        {/* Social proof metrics */}
                        <div className="hero-metrics flex flex-wrap gap-8 sm:gap-12">
                            {[
                                { value: 10, suffix: 'K+', label: 'Tasks Managed' },
                                { value: 99.9, suffix: '%', label: 'Uptime' },
                                { value: 500, suffix: '+', label: 'Teams' },
                            ].map((metric, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-2xl sm:text-3xl font-bold text-white">
                                        <AnimatedCounter target={metric.value} suffix={metric.suffix} />
                                    </span>
                                    <span className="text-sm text-gray-500 mt-1">{metric.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent z-[2]" />
            </section>

            {/* ─── TRUSTED BY / INTEGRATION STRIP ─────────────── */}
            <section className="relative py-20 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.p
                        className="text-center text-sm uppercase tracking-widest text-gray-500 mb-10"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Built with modern technologies
                    </motion.p>
                    <motion.div
                        className="flex flex-wrap justify-center gap-8 md:gap-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        {integrations.map((tech, i) => (
                            <motion.div
                                key={i}
                                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group cursor-default"
                                whileHover={{ y: -3 }}
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">{tech.icon}</span>
                                <span className="text-sm font-semibold tracking-wide">{tech.name}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ─── FEATURES GRID ──────────────────────────────── */}
            <section ref={featuresRef} className="relative py-28">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 mb-6">
                            <Code className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-300">Features</span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            Everything you need to{' '}
                            <GradientText>ship faster</GradientText>
                        </h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                            A complete project management suite with AI intelligence, real-time collaboration, and beautiful analytics.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={i}
                                    className="group relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: i * 0.08 }}
                                    viewport={{ once: true }}
                                    whileHover={{ y: -5 }}
                                >
                                    {/* Hover glow */}
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── BENTO SHOWCASE ─────────────────────────────── */}
            <section className="py-28 relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            Designed for{' '}
                            <GradientText>modern teams</GradientText>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Large card - AI */}
                        <motion.div
                            className="lg:col-span-2 relative group rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-950/40 to-violet-950/20 p-10 overflow-hidden min-h-[320px]"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-700" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Copilot</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold mb-3">Your intelligent workspace assistant</h3>
                                <p className="text-gray-400 max-w-lg mb-8">
                                    Generate tasks from project descriptions, summarize meetings into action items,
                                    and get instant answers about your workspace — all powered by Gemini AI.
                                </p>
                                {/* Mock AI chat */}
                                <div className="flex flex-col gap-3 max-w-md">
                                    <div className="self-end bg-indigo-600/30 border border-indigo-500/20 px-4 py-2.5 rounded-2xl rounded-br-md text-sm text-indigo-100">
                                        Generate tasks for a new mobile app project
                                    </div>
                                    <div className="self-start bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-gray-300 max-w-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sparkles className="w-3 h-3 text-indigo-400" />
                                            <span className="text-xs text-indigo-400 font-semibold">AI Response</span>
                                        </div>
                                        Created 12 tasks with subtasks, assigned priorities, and estimated 3-week timeline ✨
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Small card - Kanban */}
                        <motion.div
                            className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 overflow-hidden"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Kanban</span>
                            </div>
                            <h3 className="text-lg font-bold mb-3">Drag & Drop Boards</h3>
                            <p className="text-gray-500 text-sm mb-6">Move tasks across stages with smooth drag-and-drop and optimistic updates.</p>
                            {/* Mini kanban preview */}
                            <div className="flex gap-2">
                                {['Todo', 'Doing', 'Done'].map((col, i) => (
                                    <div key={i} className="flex-1 bg-white/5 rounded-lg p-2">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-2">{col}</p>
                                        {[...Array(3 - i)].map((_, j) => (
                                            <div key={j} className="h-5 bg-white/5 rounded mb-1.5 last:mb-0" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Small card - Attendance */}
                        <motion.div
                            className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 overflow-hidden"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Attendance</span>
                            </div>
                            <h3 className="text-lg font-bold mb-3">Track Presence</h3>
                            <p className="text-gray-500 text-sm mb-6">One-click check-in/out with monthly reports and productivity analytics.</p>
                            {/* Mini chart */}
                            <div className="flex items-end gap-1.5 h-16">
                                {[65, 80, 92, 78, 95, 88, 91].map((h, i) => (
                                    <div key={i} className="flex-1 bg-emerald-500/30 rounded-t" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </motion.div>

                        {/* Wide card - Analytics */}
                        <motion.div
                            className="lg:col-span-2 group rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/40 p-10 overflow-hidden"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-pink-400" />
                                    </div>
                                    <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Dashboard</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Real-time analytics that matter</h3>
                            <p className="text-gray-400 max-w-lg mb-8">
                                Track project progress, team productivity, attendance rates, and leave statistics
                                with beautiful Recharts visualizations.
                            </p>
                            {/* Mock dashboard metrics */}
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: 'Active Projects', value: '12', color: 'text-emerald-400' },
                                    { label: 'Total Tasks', value: '248', color: 'text-blue-400' },
                                    { label: 'Attendance', value: '94%', color: 'text-purple-400' },
                                    { label: 'Productivity', value: '↑ 23%', color: 'text-amber-400' },
                                ].map((m, i) => (
                                    <div key={i} className="bg-white/5 rounded-xl p-4">
                                        <p className="text-[11px] text-gray-500 mb-1">{m.label}</p>
                                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS / SOCIAL PROOF ────────────────── */}
            <section className="py-28 relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            Loved by{' '}
                            <GradientText>developers</GradientText>
                        </h2>
                        <p className="text-lg text-gray-400">See what builders are saying about TaskForge AI</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: 'Sarah Chen', role: 'Engineering Lead', review: 'The AI task generator alone saved us hours of sprint planning. The Kanban board is buttery smooth.', avatar: 'SC' },
                            { name: 'Marcus Ali', role: 'Product Manager', review: 'Finally a tool that combines project management with attendance and leave tracking. No more juggling 5 apps.', avatar: 'MA' },
                            { name: 'Priya Sharma', role: 'Full-Stack Dev', review: 'The codebase is clean TypeScript + Drizzle ORM. Easy to extend and customize for our team\'s needs.', avatar: 'PS' },
                        ].map((testimonial, i) => (
                            <motion.div
                                key={i}
                                className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <div className="flex gap-1 mb-5">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-6">"{testimonial.review}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                                        <p className="text-xs text-gray-500">{testimonial.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA SECTION ────────────────────────────────── */}
            <section className="py-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-8">
                            <Cpu className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-300">Free to get started</span>
                        </div>

                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Ready to transform your{' '}
                            <GradientText>workflow?</GradientText>
                        </h2>
                        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
                            Join hundreds of teams using TaskForge AI to ship products faster
                            with AI-powered project management.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                to="/register"
                                className="group relative inline-flex items-center gap-2 px-10 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-xl shadow-white/10"
                            >
                                Start Building — It's Free
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <p className="text-sm text-gray-600 mt-6">No credit card required · Setup in 2 minutes</p>
                    </motion.div>
                </div>
            </section>

            {/* ─── FOOTER ─────────────────────────────────────── */}
            <footer className="border-t border-white/5 py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <h3 className="text-xl font-bold mb-3">
                                <GradientText>TaskForge AI</GradientText>
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                AI-powered project management for modern teams.
                            </p>
                        </div>
                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
                            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Status'] },
                        ].map((col, i) => (
                            <div key={i}>
                                <h4 className="text-sm font-semibold text-gray-300 mb-4">{col.title}</h4>
                                <ul className="space-y-3">
                                    {col.links.map((link, j) => (
                                        <li key={j}>
                                            <span className="text-sm text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                                                {link}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/5">
                        <p className="text-sm text-gray-600">© 2026 TaskForge AI. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 sm:mt-0">
                            {['Twitter', 'GitHub', 'Discord'].map((s, i) => (
                                <span key={i} className="text-sm text-gray-600 hover:text-gray-300 transition-colors cursor-pointer">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
