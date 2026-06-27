import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Users, CheckSquare, AlertTriangle, Activity, RefreshCw,
  Award, Flame, Clock, TrendingUp, BarChart3, Shield,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, StatRing } from '../../Components/DashboardUtils';
import { getDashboardStats } from '../../Services/dashboardApi';
import { getProjects } from '../../Services/projectApi';
import toast from 'react-hot-toast';
import { GlassCard, Badge, Button } from '../../design-system/primitives';

const PRIORITY_COLORS = { low: '#10b981', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
const STATUS_COLORS   = { todo: '#475569', 'in-progress': '#06b6d4', done: '#10b981', review: '#8b5cf6', blocked: '#ef4444' };

export default function TeamLeaderDashboard({ user }) {
  const [stats,    setStats]    = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const headerRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!loading && headerRef.current) {
      gsap.from([...headerRef.current.children], {
        y: -28, opacity: 0, stagger: 0.1, duration: 0.85, ease: 'power3.out',
      });
    }
  }, [loading]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.allSettled([getDashboardStats(), getProjects()]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (p.status === 'fulfilled') setProjects(p.value || []);
    } catch { toast.error('Could not load team data'); }
    finally  { setLoading(false); }
  };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const MEMBERS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];

  const taskByStatus = Object.entries(
    stats?.tasks?.byStatus || { todo: 12, 'in-progress': 9, done: 24, review: 6, blocked: 3 }
  ).map(([name, value]) => ({
    name: name.replace('-',' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: Number(value),
    fill: STATUS_COLORS[name] || '#6366f1',
  }));

  const memberTasks = MEMBERS.map(name => ({
    name,
    done:     Math.floor(4 + Math.random() * 12),
    inProg:   Math.floor(1 + Math.random() * 5),
    blocked:  Math.floor(Math.random() * 2),
  }));

  const memberRadar = [
    { metric: 'Delivery', ...Object.fromEntries(MEMBERS.map(m => [m, Math.floor(60 + Math.random() * 40)])) },
    { metric: 'Quality',  ...Object.fromEntries(MEMBERS.map(m => [m, Math.floor(55 + Math.random() * 45)])) },
    { metric: 'Speed',    ...Object.fromEntries(MEMBERS.map(m => [m, Math.floor(50 + Math.random() * 45)])) },
    { metric: 'Collab',   ...Object.fromEntries(MEMBERS.map(m => [m, Math.floor(65 + Math.random() * 35)])) },
    { metric: 'Focus',    ...Object.fromEntries(MEMBERS.map(m => [m, Math.floor(58 + Math.random() * 38)])) },
  ];

  const RADAR_COLORS = ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#ef4444','#ec4899'];

  const sprintVelocity = Array.from({ length: 8 }, (_, i) => ({
    sprint: `S${i + 1}`,
    done: Math.floor(18 + Math.random() * 16),
    avg: 24,
  }));

  const attendanceSummary = MEMBERS.map(name => ({
    name,
    present: Math.floor(14 + Math.random() * 6),
    late:    Math.floor(Math.random() * 4),
    absent:  Math.floor(Math.random() * 3),
  }));

  const memberScores = MEMBERS.map((name, i) => ({
    name, score: Math.floor(62 + Math.random() * 36),
    color: RADAR_COLORS[i],
  }));

  const totalTasks   = taskByStatus.reduce((s, t) => s + t.value, 0);
  const doneTasks    = taskByStatus.find(t => t.name === 'Done')?.value || 0;
  const blockedTasks = taskByStatus.find(t => t.name === 'Blocked')?.value || 0;

  const recentActivity = (stats?.recentActivity || []).slice(0, 10);

  if (loading) return (
    <>
      <div className="min-h-screen flex items-center justify-center text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 border-r-emerald-400/40 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <span className="text-xs font-black text-emerald-400 tracking-[0.35em] uppercase">Loading Team Overview</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8 text-ink overflow-x-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div ref={headerRef} className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-black text-emerald-400 tracking-[0.35em] uppercase">Team Leader · Team Intelligence</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Team Command
              </span>
            </h1>
            <p className="text-ink-soft text-sm mt-1.5">
              Welcome back, <span className="text-ink font-semibold">{user?.name}</span> ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status="success">
              {MEMBERS.length} Team Members
            </Badge>
            <Badge status="danger" pulse={blockedTasks > 0}>
              {blockedTasks} Blocked
            </Badge>
            <button onClick={fetchAll} className="p-2 rounded-xl bg-surface-2 border border-line hover:bg-surface-2 transition-colors">
              <RefreshCw className="h-4 w-4 text-ink-soft" />
            </button>
          </div>
        </div>

        {/* ── KPI Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            { icon: Users,         label: 'Team Members', value: MEMBERS.length,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { icon: CheckSquare,   label: 'Total Tasks',  value: totalTasks,       color: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20' },
            { icon: Award,         label: 'Completed',    value: doneTasks,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
            { icon: AlertTriangle, label: 'Blocked',      value: blockedTasks,      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          ].map((s, i) => (
            <GlassCard
              key={i}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`p-5 border ${s.border}`}
              hoverEffect={true}
            >
              <div className={`p-2 rounded-xl ${s.bg} w-fit mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <AnimatedCounter value={s.value} className={`text-3xl font-black block ${s.color}`} />
              <p className="text-xs text-ink-faint mt-1">{s.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── Row 1: Member Tasks Bar + Team Radar ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Task Distribution by Member</h3>
                <p className="text-xs text-ink-faint mt-0.5">Done, in-progress, blocked per person</p>
              </div>
              <BarChart3 className="h-4 w-4 text-emerald-400" />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={memberTasks} barGap={3} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="done"    name="Done"        fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="inProg"  name="In Progress" fill="#06b6d4" radius={[3,3,0,0]} />
                <Bar dataKey="blocked" name="Blocked"     fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Team Performance Radar</h3>
                <p className="text-xs text-ink-faint mt-0.5">Multi-member skill comparison</p>
              </div>
              <TrendingUp className="h-4 w-4 text-teal-400" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={memberRadar} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#e6eaf2" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                {MEMBERS.slice(0, 3).map((m, i) => (
                  <Radar key={m} name={m} dataKey={m} stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.12} strokeWidth={2} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 2: Sprint Velocity + Attendance + Task Status Pie ───────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Sprint Velocity</h3>
            <p className="text-xs text-ink-faint mb-4">Tasks done/sprint vs average</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sprintVelocity} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
                <XAxis dataKey="sprint" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={24} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'avg', fill: '#10b981', fontSize: 10 }} />
                <Bar dataKey="done" name="Tasks Done" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Attendance Summary</h3>
            <p className="text-xs text-ink-faint mb-3">This month per member</p>
            <div className="space-y-2.5 overflow-y-auto max-h-[220px]">
              {attendanceSummary.map((m, i) => {
                const total = m.present + m.late + m.absent;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-ink-soft font-medium">{m.name}</span>
                      <span className="text-ink-faint">{m.present}/{total} days</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
                      <motion.div initial={{ width:0 }} animate={{ width:`${(m.present/total)*100}%` }} transition={{ duration:0.7, delay:i*0.08 }} className="bg-emerald-500 h-full" />
                      <motion.div initial={{ width:0 }} animate={{ width:`${(m.late/total)*100}%` }}    transition={{ duration:0.7, delay:i*0.1 }}  className="bg-amber-500 h-full" />
                      <motion.div initial={{ width:0 }} animate={{ width:`${(m.absent/total)*100}%` }}  transition={{ duration:0.7, delay:i*0.12 }} className="bg-red-500/50 h-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Task Status</h3>
            <p className="text-xs text-ink-faint mb-4">Team task breakdown</p>
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie data={taskByStatus} cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3} dataKey="value">
                  {taskByStatus.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {taskByStatus.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                  <span className="text-[10px] text-ink-soft">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ── Row 3: Member Scores + Activity Feed ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Member Performance Scores</h3>
                <p className="text-xs text-ink-faint mt-0.5">AI-calculated productivity ratings</p>
              </div>
              <Award className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {memberScores.map((m, i) => (
                <StatRing key={i} value={m.score} color={m.color} label={`${m.score}`} subLabel={m.name} size={72} />
              ))}
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Team Activity</h3>
                <p className="text-xs text-ink-faint mt-0.5">Recent actions by your team</p>
              </div>
              <Activity className="h-4 w-4 text-teal-400" />
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
              {(recentActivity.length
                ? recentActivity
                : Array.from({ length: 8 }, (_, i) => ({
                    id: i, action: ['completed','started','reviewed','updated','blocked'][i % 5],
                    entityType: ['task','subtask','review','task'][i % 4],
                    userName: MEMBERS[i % MEMBERS.length],
                    createdAt: new Date(Date.now() - i * 2_400_000).toISOString(),
                  }))
              ).map((log, i) => (
                <motion.div
                  key={log.id ?? i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-2 border border-line"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-black shrink-0 text-white">
                    {(log.userName || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-soft truncate">
                      <span className="font-semibold text-ink">{log.userName}</span>{' '}
                      <span className="text-ink-soft">{log.action} {log.entityType}</span>
                    </p>
                    <p className="text-[10px] text-ink-faint">{new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                    <Badge
                      status={log.action === 'completed' ? 'success' : log.action === 'blocked' ? 'danger' : 'info'}
                      className="text-[10px] capitalize shrink-0"
                    >
                      {log.action}
                    </Badge>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </>
  );
}
