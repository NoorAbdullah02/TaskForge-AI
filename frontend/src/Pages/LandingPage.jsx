import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
    Zap, Shield, BarChart3, Brain, Layers, Globe, ArrowRight,
    CheckCircle, Sparkles, Code, Cpu, Star, ChevronRight, Play
} from 'lucide-react';
import { GlassCard, Button } from '../design-system/primitives';

/* ── Helpers ─────────────────────────────────────────────── */

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

const GradientText = ({ children, className = '' }) => (
    <span className={`text-gradient-brand ${className}`}>{children}</span>
);

/* ── Landing ─────────────────────────────────────────────── */

const LandingPage = () => {
    const heroRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, delay: 0.1 });
            gsap.from('.hero-title', { opacity: 0, y: 50, duration: 1, delay: 0.3 });
            gsap.from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.8, delay: 0.6 });
            gsap.from('.hero-buttons', { opacity: 0, y: 30, duration: 0.8, delay: 0.8 });
            gsap.from('.hero-metrics', { opacity: 0, y: 30, duration: 0.8, delay: 1.0 });
            gsap.from('.hero-visual', { opacity: 0, scale: 0.96, duration: 1, delay: 0.5, ease: 'power2.out' });
        }, heroRef);
        return () => ctx.revert();
    }, []);

    const features = [
        { icon: Zap, title: 'Lightning Fast', description: 'Real-time task updates with optimistic UI. No loading spinners, just instant feedback.', tone: 'from-amber-400 to-orange-500' },
        { icon: Brain, title: 'AI-Powered', description: 'Mistral AI generates tasks, summarizes meetings, and answers questions about your workspace.', tone: 'from-violet-500 to-indigo-600' },
        { icon: Layers, title: 'Kanban & Beyond', description: 'Drag-and-drop boards, list views, and timeline views to manage projects your way.', tone: 'from-blue-500 to-cyan-500' },
        { icon: Shield, title: 'Enterprise Security', description: 'JWT authentication, email verification, and role-based access control built-in.', tone: 'from-emerald-500 to-teal-500' },
        { icon: BarChart3, title: 'Analytics Dashboard', description: 'Recharts-powered dashboards with attendance tracking, leave stats, and productivity metrics.', tone: 'from-pink-500 to-rose-500' },
        { icon: Globe, title: 'Cloud Native', description: 'PostgreSQL + Drizzle ORM with ImageKit CDN for global file delivery. Deploy anywhere.', tone: 'from-indigo-500 to-violet-600' },
    ];

    const integrations = [
        { name: 'PostgreSQL', icon: '🐘' },
        { name: 'ImageKit', icon: '🖼️' },
        { name: 'Mistral AI', icon: '🤖' },
        { name: 'React', icon: '⚛️' },
        { name: 'Node.js', icon: '🟢' },
        { name: 'TypeScript', icon: '💎' },
    ];

    return (
        <div className="text-ink overflow-hidden">
            {/* ─── HERO ─────────────────────────────────────────── */}
            <section ref={heroRef} className="relative min-h-screen flex items-center">
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-16 grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: copy */}
                    <div>
                        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/20 bg-brand/5 backdrop-blur-sm mb-8">
                            <Sparkles className="w-4 h-4 text-brand" />
                            <span className="text-sm font-medium text-brand">Now with Mistral AI Integration</span>
                            <ChevronRight className="w-4 h-4 text-brand" />
                        </div>

                        <h1 className="hero-title text-5xl sm:text-6xl lg:text-[4.2rem] font-bold leading-[1.05] tracking-tight mb-6">
                            Build faster with{' '}
                            <GradientText>AI-powered</GradientText>{' '}
                            project management
                        </h1>

                        <p className="hero-subtitle text-lg sm:text-xl text-ink-soft max-w-xl mb-10 leading-relaxed">
                            TaskForge AI brings together tasks, teams, attendance, and AI intelligence
                            in one beautiful workspace. Ship products faster than ever.
                        </p>

                        <div className="hero-buttons flex flex-wrap gap-4 mb-14">
                            <Link to="/register">
                                <Button size="lg" variant="primary" icon={ArrowRight} iconPosition="right">
                                    Get Started Free
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button size="lg" variant="outline" icon={Play}>
                                    Live Demo
                                </Button>
                            </Link>
                        </div>

                        <div className="hero-metrics flex flex-wrap gap-8 sm:gap-12">
                            {[
                                { value: 10, suffix: 'K+', label: 'Tasks Managed' },
                                { value: 99.9, suffix: '%', label: 'Uptime' },
                                { value: 500, suffix: '+', label: 'Teams' },
                            ].map((metric, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-2xl sm:text-3xl font-bold text-ink">
                                        <AnimatedCounter target={metric.value} suffix={metric.suffix} />
                                    </span>
                                    <span className="text-sm text-ink-faint mt-1">{metric.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: product preview mock */}
                    <div className="hero-visual relative">
                        <motion.div
                            animate={{ y: [0, -12, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <GlassCard hoverEffect={false} padding="p-5" className="shadow-float">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-3 h-3 rounded-full bg-red-400" />
                                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                    <span className="ml-3 text-xs font-semibold text-ink-faint">TaskForge · Sprint Board</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { col: 'To Do', n: 3, c: 'bg-blue-500' },
                                        { col: 'In Progress', n: 2, c: 'bg-indigo-500' },
                                        { col: 'Done', n: 4, c: 'bg-emerald-500' },
                                    ].map((k, i) => (
                                        <div key={i} className="bg-surface-2 rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <span className={`w-2 h-2 rounded-full ${k.c}`} />
                                                <span className="text-[11px] font-semibold text-ink-soft">{k.col}</span>
                                            </div>
                                            {[...Array(k.n)].map((_, j) => (
                                                <div key={j} className="bg-white rounded-lg p-2 mb-2 shadow-soft last:mb-0">
                                                    <div className="h-1.5 w-3/4 bg-line rounded mb-1.5" />
                                                    <div className="h-1.5 w-1/2 bg-line rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </motion.div>

                        {/* Floating AI chip */}
                        <motion.div
                            className="absolute -bottom-6 -left-6 hidden sm:block"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <GlassCard hoverEffect={false} padding="p-3" className="shadow-float">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-brand/10 grid place-items-center">
                                        <Brain className="w-4 h-4 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-ink">AI Copilot</p>
                                        <p className="text-[10px] text-ink-faint">12 tasks generated ✨</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ─── TECH STRIP ───────────────────────────────────── */}
            <section className="relative py-20 border-t border-line">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.p
                        className="text-center text-sm uppercase tracking-widest text-ink-faint mb-10"
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
                                className="flex items-center gap-3 text-ink-soft hover:text-ink transition-colors group cursor-default"
                                whileHover={{ y: -3 }}
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">{tech.icon}</span>
                                <span className="text-sm font-semibold tracking-wide">{tech.name}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ─── FEATURES ─────────────────────────────────────── */}
            <section className="relative py-28">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/20 bg-brand/5 mb-6">
                            <Code className="w-4 h-4 text-brand" />
                            <span className="text-sm font-medium text-brand">Features</span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            Everything you need to <GradientText>ship faster</GradientText>
                        </h2>
                        <p className="text-lg text-ink-soft max-w-2xl mx-auto">
                            A complete project management suite with AI intelligence, real-time collaboration, and beautiful analytics.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <GlassCard
                                    key={i}
                                    padding="p-8"
                                    className="group"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: i * 0.06 }}
                                    viewport={{ once: true }}
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.tone} flex items-center justify-center mb-6 shadow-soft`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-ink mb-3">{feature.title}</h3>
                                    <p className="text-ink-soft text-sm leading-relaxed">{feature.description}</p>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── BENTO SHOWCASE ───────────────────────────────── */}
            <section className="py-28 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            Designed for <GradientText>modern teams</GradientText>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Large card - AI */}
                        <GlassCard
                            padding="p-10"
                            hoverEffect={false}
                            className="lg:col-span-2 min-h-[320px]"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-brand" />
                                </div>
                                <span className="text-xs font-semibold text-brand uppercase tracking-wider">AI Copilot</span>
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-ink">Your intelligent workspace assistant</h3>
                            <p className="text-ink-soft max-w-lg mb-8">
                                Generate tasks from project descriptions, summarize meetings into action items,
                                and get instant answers about your workspace — all powered by Mistral AI.
                            </p>
                            <div className="flex flex-col gap-3 max-w-md">
                                <div className="self-end bg-brand text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm shadow-soft">
                                    Generate tasks for a new mobile app project
                                </div>
                                <div className="self-start bg-surface-2 border border-line px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-ink-soft max-w-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-3 h-3 text-brand" />
                                        <span className="text-xs text-brand font-semibold">AI Response</span>
                                    </div>
                                    Created 12 tasks with subtasks, assigned priorities, and estimated 3-week timeline ✨
                                </div>
                            </div>
                        </GlassCard>

                        {/* Kanban */}
                        <GlassCard
                            padding="p-8"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-blue-500" />
                                </div>
                                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Kanban</span>
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-ink">Drag & Drop Boards</h3>
                            <p className="text-ink-soft text-sm mb-6">Move tasks across stages with smooth drag-and-drop and optimistic updates.</p>
                            <div className="flex gap-2">
                                {['Todo', 'Doing', 'Done'].map((col, i) => (
                                    <div key={i} className="flex-1 bg-surface-2 rounded-lg p-2">
                                        <p className="text-[10px] font-semibold text-ink-faint mb-2">{col}</p>
                                        {[...Array(3 - i)].map((_, j) => (
                                            <div key={j} className="h-5 bg-white rounded mb-1.5 last:mb-0 shadow-soft" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Attendance */}
                        <GlassCard
                            padding="p-8"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                </div>
                                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Attendance</span>
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-ink">Track Presence</h3>
                            <p className="text-ink-soft text-sm mb-6">One-click check-in/out with monthly reports and productivity analytics.</p>
                            <div className="flex items-end gap-1.5 h-16">
                                {[65, 80, 92, 78, 95, 88, 91].map((h, i) => (
                                    <div key={i} className="flex-1 bg-emerald-400 rounded-t" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </GlassCard>

                        {/* Analytics */}
                        <GlassCard
                            padding="p-10"
                            hoverEffect={false}
                            className="lg:col-span-2"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-pink-500" />
                                </div>
                                <span className="text-xs font-semibold text-pink-500 uppercase tracking-wider">Dashboard</span>
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-ink">Real-time analytics that matter</h3>
                            <p className="text-ink-soft max-w-lg mb-8">
                                Track project progress, team productivity, attendance rates, and leave statistics
                                with beautiful Recharts visualizations.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Active Projects', value: '12', color: 'text-emerald-600' },
                                    { label: 'Total Tasks', value: '248', color: 'text-brand' },
                                    { label: 'Attendance', value: '94%', color: 'text-accent' },
                                    { label: 'Productivity', value: '↑ 23%', color: 'text-amber-600' },
                                ].map((m, i) => (
                                    <div key={i} className="bg-surface-2 rounded-xl p-4">
                                        <p className="text-[11px] text-ink-faint mb-1">{m.label}</p>
                                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ─────────────────────────────────── */}
            <section className="py-28 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            Loved by <GradientText>developers</GradientText>
                        </h2>
                        <p className="text-lg text-ink-soft">See what builders are saying about TaskForge AI</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: 'Sarah Chen', role: 'Engineering Lead', review: 'The AI task generator alone saved us hours of sprint planning. The Kanban board is buttery smooth.', avatar: 'SC' },
                            { name: 'Marcus Ali', role: 'Product Manager', review: 'Finally a tool that combines project management with attendance and leave tracking. No more juggling 5 apps.', avatar: 'MA' },
                            { name: 'Priya Sharma', role: 'Full-Stack Dev', review: 'The codebase is clean TypeScript + Drizzle ORM. Easy to extend and customize for our team\'s needs.', avatar: 'PS' },
                        ].map((t, i) => (
                            <GlassCard
                                key={i}
                                padding="p-8"
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
                                <p className="text-ink-soft text-sm leading-relaxed mb-6">"{t.review}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white font-bold text-xs">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{t.name}</p>
                                        <p className="text-xs text-ink-faint">{t.role}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA ──────────────────────────────────────────── */}
            <section className="py-32 relative">
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 mb-8">
                            <Cpu className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">Free to get started</span>
                        </div>

                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Ready to transform your <GradientText>workflow?</GradientText>
                        </h2>
                        <p className="text-lg text-ink-soft max-w-xl mx-auto mb-10">
                            Join hundreds of teams using TaskForge AI to ship products faster
                            with AI-powered project management.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/register">
                                <Button size="lg" variant="primary" icon={ArrowRight} iconPosition="right">
                                    Start Building — It's Free
                                </Button>
                            </Link>
                        </div>

                        <p className="text-sm text-ink-faint mt-6">No credit card required · Setup in 2 minutes</p>
                    </motion.div>
                </div>
            </section>

            {/* ─── FOOTER ───────────────────────────────────────── */}
            <footer className="border-t border-line py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <h3 className="text-xl font-bold mb-3">
                                <GradientText>TaskForge AI</GradientText>
                            </h3>
                            <p className="text-sm text-ink-faint leading-relaxed">
                                AI-powered project management for modern teams.
                            </p>
                        </div>
                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
                            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Status'] },
                        ].map((col, i) => (
                            <div key={i}>
                                <h4 className="text-sm font-semibold text-ink mb-4">{col.title}</h4>
                                <ul className="space-y-3">
                                    {col.links.map((link, j) => (
                                        <li key={j}>
                                            <span className="text-sm text-ink-faint hover:text-ink transition-colors cursor-pointer">
                                                {link}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-line">
                        <p className="text-sm text-ink-faint">© 2026 TaskForge AI. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 sm:mt-0">
                            {['Twitter', 'GitHub', 'Discord'].map((s, i) => (
                                <span key={i} className="text-sm text-ink-faint hover:text-ink transition-colors cursor-pointer">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
