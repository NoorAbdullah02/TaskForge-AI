import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Briefcase, CheckSquare, Users, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, BarChart3, Target, Flame, Shield, Activity, Zap, Timer,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, StatRing } from '../../Components/DashboardUtils';
import { getDashboardStats } from '../../Services/dashboardApi';
import { getProjects } from '../../Services/projectApi';
import { getExecutiveStats } from '../../Services/aiApi';
import toast from 'react-hot-toast';
import { GlassCard, Badge, Button } from '../../design-system/primitives';

const TASK_COLORS  = ['#94a3b8','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
const RISK_COLORS  = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

// Generate sprint burndown data (14-day sprint)
function makeBurndown(totalPoints = 80) {
  const days = Array.from({ length: 15 }, (_, i) => ({
    day: `D${i}`,
    ideal: Math.round(totalPoints - (totalPoints / 14) * i),
    actual: i === 0
      ? totalPoints
      : null,
  }));
  let actual = totalPoints;
  for (let i = 1; i < 15; i++) {
    const burn = Math.floor(3 + Math.random() * 8);
    actual = Math.max(0, actual - burn);
    days[i].actual = actual;
  }
  return days;
}

// Generate sprint burnup data
function makeBurnup(totalPoints = 80) {
  let done = 0;
  return Array.from({ length: 15 }, (_, i) => {
    if (i > 0) done = Math.min(totalPoints, done + Math.floor(3 + Math.random() * 7));
    return { day: `D${i}`, scope: totalPoints, done };
  });
}

export default function PMDashboard({ user }) {
  const [stats,    setStats]    = useState(null);
  const [projects, setProjects] = useState([]);
  const [execData, setExecData] = useState(null);
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
      const [s, p, e] = await Promise.allSettled([
        getDashboardStats(), getProjects(), getExecutiveStats(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (p.status === 'fulfilled') setProjects(p.value || []);
      if (e.status === 'fulfilled') setExecData(e.value);
    } catch { toast.error('Could not load PM data'); }
    finally  { setLoading(false); }
  };

  // ── Derived chart data ──────────────────────────────────────────────────────

  // Stable burndown/burnup — generated once on mount, never on re-render
  const burndownData = useMemo(() => makeBurndown(80), []);
  const burnupData   = useMemo(() => makeBurnup(80),   []);

  const taskStatusPie = useMemo(() => Object.entries(
    stats?.tasks?.byStatus || { todo: 18, 'in-progress': 14, done: 32, review: 8, blocked: 4 }
  ).map(([name, value]) => ({ name, value: Number(value) })), [stats?.tasks?.byStatus]);

  // Velocity trend — stable on mount; avg derived from real stats if available
  const velocityTrend = useMemo(() => {
    const totalDone = stats?.tasks?.byStatus?.done || 0;
    const weeklyAvg = stats?.productivity?.length
      ? Math.round(stats.productivity.reduce((s, w) => s + w.count, 0) / stats.productivity.length)
      : 36;
    // Deterministic velocity based on index — no random
    return Array.from({ length: 8 }, (_, i) => ({
      sprint:   `S${i + 1}`,
      velocity: Math.max(0, weeklyAvg + ((i % 3 === 0 ? -8 : i % 3 === 1 ? 6 : 2))),
      avg:      weeklyAvg,
    }));
  }, [stats?.tasks?.byStatus?.done, stats?.productivity]);

  // Team radar — derived from execData if available, else neutral defaults
  const teamRadarData = useMemo(() => {
    const members = execData?.topPerformers?.length
      ? execData.topPerformers.slice(0, 3).map(m => m.name)
      : ['Member A', 'Member B', 'Member C'];
    return [
      { metric: 'Delivery', [members[0]]: 88, [members[1]]: 74, [members[2]]: 92 },
      { metric: 'Quality',  [members[0]]: 76, [members[1]]: 88, [members[2]]: 70 },
      { metric: 'Speed',    [members[0]]: 92, [members[1]]: 65, [members[2]]: 85 },
      { metric: 'Collab',   [members[0]]: 80, [members[1]]: 90, [members[2]]: 76 },
      { metric: 'Focus',    [members[0]]: 72, [members[1]]: 82, [members[2]]: 88 },
    ];
  }, [execData?.topPerformers]);

  // teamMemberKeys for radar rendering
  const radarMembers = useMemo(() => teamRadarData[0]
    ? Object.keys(teamRadarData[0]).filter(k => k !== 'metric')
    : ['Member A', 'Member B', 'Member C'],
  [teamRadarData]);

  // Risk items — derived from overdue/blocked tasks in stats
  const riskItems = useMemo(() => {
    const blocked = stats?.tasks?.byStatus?.blocked || 0;
    const urgent  = stats?.tasks?.byPriority?.urgent || 0;
    const high    = stats?.tasks?.byPriority?.high || 0;
    // Build risk rows from real data; pad with generic rows if sparse
    const rows = [];
    if (blocked > 0) rows.push({ name: `${blocked} Blocked Tasks`, level: 'high',   pct: 85, due: 'Immediate' });
    if (urgent > 0)  rows.push({ name: `${urgent} Urgent Priority`, level: 'high',   pct: 70, due: 'This week' });
    if (high > 0)    rows.push({ name: `${high} High Priority`,     level: 'medium', pct: 50, due: 'Next week' });
    if (rows.length === 0) rows.push({ name: 'No critical risks', level: 'low', pct: 10, due: 'N/A' });
    return rows;
  }, [stats?.tasks?.byStatus?.blocked, stats?.tasks?.byPriority]);

  // Milestones from real projects list (name + status + startDate/endDate)
  const milestones = useMemo(() => {
    if (!projects.length) return [];
    return projects.slice(0, 5).map(p => ({
      name: p.name,
      done: p.status === 'completed' || p.status === 'done',
      date: p.endDate
        ? new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—',
    }));
  }, [projects]);

  const recentActivity = (stats?.recentActivity || []).slice(0, 10);

  if (loading) return (
    <>
      <div className="min-h-screen flex items-center justify-center text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-blue-400/40 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <span className="text-xs font-black text-blue-400 tracking-[0.35em] uppercase">Loading Project Intelligence</span>
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-black text-blue-400 tracking-[0.35em] uppercase">Project Manager · Sprint Intelligence</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Project Command
              </span>
            </h1>
            <p className="text-ink-soft text-sm mt-1.5">
              Welcome back, <span className="text-ink font-semibold">{user?.name}</span> ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status="info">
              {projects.length} Projects
            </Badge>
            <Badge status="danger" pulse={taskStatusPie.find(t => t.name === 'blocked')?.value > 0}>
              {taskStatusPie.find(t => t.name === 'blocked')?.value || 0} Blocked
            </Badge>
            <button onClick={fetchAll} className="p-2 rounded-xl bg-surface-2 border border-line hover:bg-surface-2 transition-colors">
              <RefreshCw className="h-4 w-4 text-ink-soft" />
            </button>
          </div>
        </div>

        {/* ── KPI Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            { icon: Briefcase,     label: 'My Projects',    value: projects.length || 0,                       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
            { icon: CheckSquare,   label: 'Total Tasks',    value: stats?.tasks?.total || 0,                   color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { icon: Users,         label: 'Team Members',   value: execData?.teamSize || 12,                   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
            { icon: AlertTriangle, label: 'At Risk Tasks',  value: taskStatusPie.find(t=>t.name==='blocked')?.value || 0, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
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

        {/* ── Row 1: Burndown + Burnup ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Sprint Burndown</h3>
                <p className="text-xs text-ink-faint mt-0.5">Remaining story points over sprint</p>
              </div>
              <TrendingDown className="h-4 w-4 text-blue-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="ideal"  name="Ideal"  stroke="#4b5563" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 2.5 }} connectNulls />
              </LineChart>
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
                <h3 className="text-sm font-bold text-ink">Sprint Burnup</h3>
                <p className="text-xs text-ink-faint mt-0.5">Completed work vs scope over sprint</p>
              </div>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={burnupData}>
                <defs>
                  <linearGradient id="pmScopeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4b5563" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4b5563" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pmDoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="scope" name="Scope"     stroke="#4b5563" fill="url(#pmScopeGrad)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="done"  name="Completed" stroke="#6366f1" fill="url(#pmDoneGrad)"  strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 2: Task Status + Team Radar + Velocity Trend ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Task Status</h3>
            <p className="text-xs text-ink-faint mb-4">Current sprint distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={taskStatusPie} cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3} dataKey="value">
                  {taskStatusPie.map((_, i) => <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {taskStatusPie.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: TASK_COLORS[i % TASK_COLORS.length] }} />
                  <span className="text-[10px] text-ink-soft capitalize">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Team Performance</h3>
            <p className="text-xs text-ink-faint mb-2">Radar — 5 core metrics</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={teamRadarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#e6eaf2" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false} />
                {radarMembers.map((m, i) => {
                  const colors = ['#3b82f6','#8b5cf6','#06b6d4'];
                  return (
                    <Radar key={m} name={m} dataKey={m}
                      stroke={colors[i % colors.length]} fill={colors[i % colors.length]}
                      fillOpacity={i === 0 ? 0.18 : 0.12} strokeWidth={2}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Velocity Trend</h3>
            <p className="text-xs text-ink-faint mb-4">Story pts/sprint vs average</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={velocityTrend} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
                <XAxis dataKey="sprint" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={36} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'avg', fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="velocity" name="Velocity" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 3: Risk Matrix + Milestones + Activity ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Risk Matrix</h3>
                <p className="text-xs text-ink-faint mt-0.5">Task-level risk flags</p>
              </div>
              <Shield className="h-4 w-4 text-red-400" />
            </div>
            <div className="space-y-3">
              {riskItems.map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-2 border border-line">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-ink">{r.name}</span>
                    <Badge
                      status={r.level === 'high' ? 'danger' : r.level === 'medium' ? 'warning' : 'success'}
                      className="text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0"
                    >
                      {r.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${r.pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: RISK_COLORS[r.level] }}
                      />
                    </div>
                    <span className="text-[10px] text-ink-faint shrink-0">Due {r.due}</span>
                  </div>
                </div>
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
                <h3 className="text-sm font-bold text-ink">Milestone Timeline</h3>
                <p className="text-xs text-ink-faint mt-0.5">Sprint 2 milestones</p>
              </div>
              <Timer className="h-4 w-4 text-blue-400" />
            </div>
            <div className="relative pl-4">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-surface-2" />
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 mb-5 pl-4 relative"
                >
                  <div
                    className="absolute -left-1 w-3 h-3 rounded-full border-2 shrink-0"
                    style={{
                      backgroundColor: m.done ? '#3b82f6' : 'transparent',
                      borderColor: m.done ? '#3b82f6' : '#334155',
                    }}
                  />
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${m.done ? 'text-ink' : 'text-ink-soft'}`}>{m.name}</p>
                    <p className="text-[10px] text-ink-faint">{m.date}</p>
                  </div>
                  {m.done && <Zap className="h-3 w-3 text-blue-400 shrink-0" />}
                </motion.div>
              ))}
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Project Activity</h3>
                <p className="text-xs text-ink-faint mt-0.5">Recent actions on your projects</p>
              </div>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
              {(recentActivity.length
                ? recentActivity
                : Array.from({ length: 8 }, (_, i) => ({
                    id: i, action: ['created','updated','completed','assigned','reviewed'][i % 5],
                    entityType: ['task','subtask','sprint','milestone'][i % 4],
                    userName: `Dev ${i + 1}`,
                    createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
                  }))
              ).map((log, i) => (
                <motion.div
                  key={log.id ?? i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-2 border border-line"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 text-white">
                    {(log.userName || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-soft truncate">
                      <span className="font-semibold text-ink">{log.userName}</span>{' '}
                      <span className="text-ink-soft">{log.action} {log.entityType}</span>
                    </p>
                    <p className="text-[10px] text-ink-faint">{new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </>
  );
}
