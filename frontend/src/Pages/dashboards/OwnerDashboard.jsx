import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, Briefcase, CheckSquare, CalendarOff, TrendingUp, Activity,
  Building2, RefreshCw, Crown, BarChart3, Clock, Layers,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, CalendarHeatmap, StatRing } from '../../Components/DashboardUtils';
import { getDashboardStats } from '../../Services/dashboardApi';
import { getProjects } from '../../Services/projectApi';
import { getExecutiveStats } from '../../Services/aiApi';
import toast from 'react-hot-toast';
import { GlassCard, Badge, Button } from '../../design-system/primitives';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PROJECT_STATUS_COLORS = { planning:'#94a3b8', active:'#8b5cf6', in_progress:'#a855f7', on_hold:'#f59e0b', completed:'#10b981' };

export default function OwnerDashboard({ user }) {
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
    } catch { toast.error('Could not load workspace data'); }
    finally  { setLoading(false); }
  };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const projectsByStatus = Object.entries(stats?.projects?.byStatus || { active: 4, completed: 3, on_hold: 1, planning: 2 })
    .map(([name, value]) => ({ name, value: Number(value), color: PROJECT_STATUS_COLORS[name] || '#6366f1' }));

  const taskByPriority = Object.entries(stats?.tasks?.byPriority || { low: 12, medium: 28, high: 18, urgent: 7 })
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Number(value) }));

  const PRIORITY_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444'];

  const sprintVelocity = MONTHS.slice(-7).map((m, i) => ({
    sprint: `S${i + 1}`,
    planned: Math.floor(40 + Math.random() * 20),
    completed: Math.floor(30 + Math.random() * 25),
  }));

  const memberProductivity = Array.from({ length: 8 }, (_, i) => ({
    name: `Member ${i + 1}`,
    tasks: Math.floor(5 + Math.random() * 20),
    score: Math.floor(60 + Math.random() * 40),
  })).sort((a, b) => b.tasks - a.tasks);

  const resourceUsage = MONTHS.slice(-6).map((m, i) => ({
    month: m,
    developers: Math.floor(60 + i * 3 + Math.random() * 10),
    designers:  Math.floor(40 + i * 2 + Math.random() * 8),
    qa:         Math.floor(30 + i * 2 + Math.random() * 6),
  }));

  const attendanceHeat = {};
  const today = new Date();
  for (let i = 0; i < 84; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().split('T')[0];
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      attendanceHeat[k] = Math.random() > 0.15 ? Math.floor(3 + Math.random() * 10) : 0;
    }
  }

  const leaveData = Object.entries(stats?.leaves?.byStatus || { approved: 12, pending: 5, rejected: 3 })
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Number(value) }));
  const LEAVE_COLORS = ['#10b981','#f59e0b','#ef4444'];

  const recentActivity = (stats?.recentActivity || []).slice(0, 10);

  if (loading) return (
    <>
      <div className="min-h-screen flex items-center justify-center text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-r-violet-400/40 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <span className="text-xs font-black text-violet-400 tracking-[0.35em] uppercase">Loading Workspace Overview</span>
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-black text-violet-400 tracking-[0.35em] uppercase">Workspace Owner · Overview</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Workspace Dashboard
              </span>
            </h1>
            <p className="text-ink-soft text-sm mt-1.5">
              Welcome back, <span className="text-ink font-semibold">{user?.name}</span> ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status="info">
              {projects.length} Active Projects
            </Badge>
            <Badge status="warning" pulse={stats?.leaves?.pending > 0}>
              {stats?.leaves?.pending || 0} Pending Leaves
            </Badge>
            <button onClick={fetchAll} className="p-2 rounded-xl bg-surface-2 border border-line hover:bg-surface-2 transition-colors">
              <RefreshCw className="h-4 w-4 text-ink-soft" />
            </button>
          </div>
        </div>

        {/* ── KPI Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            { icon: Briefcase,   label: 'Active Projects',  value: stats?.projects?.active || 0,          color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
            { icon: CheckSquare, label: 'Total Tasks',       value: stats?.tasks?.total || 0,               color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { icon: CalendarOff, label: 'Pending Leaves',    value: stats?.leaves?.pending || 0,            color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
            { icon: Clock,       label: 'Attendance Rate',   value: stats?.attendance?.rate || 0, suffix:'%', color: 'text-fuchsia-400',bg: 'bg-fuchsia-500/10',border: 'border-fuchsia-500/20' },
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
              <AnimatedCounter value={s.value} suffix={s.suffix || ''} className={`text-3xl font-black block ${s.color}`} />
              <p className="text-xs text-ink-faint mt-1">{s.label}</p>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Project Status Distribution</h3>
                <p className="text-xs text-ink-faint mt-0.5">Workspace-wide project health</p>
              </div>
              <Briefcase className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={projectsByStatus} cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3} dataKey="value">
                    {projectsByStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {projectsByStatus.map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-soft capitalize">{d.name.replace('_', ' ')}</span>
                      <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.value / Math.max(...projectsByStatus.map(x => x.value))) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Sprint Velocity</h3>
                <p className="text-xs text-ink-faint mt-0.5">Planned vs completed story points</p>
              </div>
              <BarChart3 className="h-4 w-4 text-purple-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={sprintVelocity} barGap={3} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
                <XAxis dataKey="sprint" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="planned"   name="Planned"   fill="#4b5563" radius={[4,4,0,0]} />
                <Bar dataKey="completed" name="Completed" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 2: Resource Usage + Task Priority ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Resource Utilization</h3>
                <p className="text-xs text-ink-faint mt-0.5">Team capacity — last 6 months</p>
              </div>
              <Users className="h-4 w-4 text-violet-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={resourceUsage}>
                <defs>
                  <linearGradient id="owDevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="owDesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="owQaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" />
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="developers" name="Developers" stroke="#8b5cf6" fill="url(#owDevGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="designers"  name="Designers"  stroke="#ec4899" fill="url(#owDesGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="qa"         name="QA"         stroke="#06b6d4" fill="url(#owQaGrad)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Task Priority Breakdown</h3>
                <p className="text-xs text-ink-faint mt-0.5">Current task distribution by urgency</p>
              </div>
              <Layers className="h-4 w-4 text-purple-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={taskByPriority} layout="vertical" barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Tasks" radius={[0, 6, 6, 0]}>
                  {taskByPriority.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 3: Attendance Heatmap + Leave Analytics ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Team Attendance Heatmap</h3>
            <p className="text-xs text-ink-faint mb-5">Check-in density — last 12 weeks</p>
            <div className="overflow-x-auto pb-1">
              <CalendarHeatmap data={attendanceHeat} color="#8b5cf6" weeks={12} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] text-ink-faint">Less</span>
              {[0.12, 0.28, 0.50, 0.72, 0.92].map((o, i) => (
                <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(139,92,246,${o})` }} />
              ))}
              <span className="text-[10px] text-ink-faint">More</span>
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Leave Analytics</h3>
                <p className="text-xs text-ink-faint mt-0.5">Leave requests by status</p>
              </div>
              <CalendarOff className="h-4 w-4 text-fuchsia-400" />
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={leaveData} cx="50%" cy="50%" outerRadius={78} innerRadius={42} paddingAngle={3} dataKey="value">
                    {leaveData.map((_, i) => <Cell key={i} fill={LEAVE_COLORS[i % LEAVE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {leaveData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: LEAVE_COLORS[i % LEAVE_COLORS.length] }} />
                      <span className="text-xs text-ink-soft">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: LEAVE_COLORS[i % LEAVE_COLORS.length] }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── Row 4: Member Productivity + Recent Activity ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Member Productivity</h3>
                <p className="text-xs text-ink-faint mt-0.5">Tasks completed per member</p>
              </div>
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={memberProductivity} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="tasks" name="Tasks Done" fill="#8b5cf6" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Workspace Activity</h3>
                <p className="text-xs text-ink-faint mt-0.5">Recent events in your workspace</p>
              </div>
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {(recentActivity.length
                ? recentActivity
                : Array.from({ length: 8 }, (_, i) => ({
                    id: i, action: ['created','updated','completed','assigned','approved'][i % 5],
                    entityType: ['task','project','sprint','member'][i % 4],
                    userName: `Team Member ${i + 1}`,
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
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-black shrink-0 text-white">
                    {(log.userName || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-soft truncate">
                      <span className="font-semibold text-ink">{log.userName}</span>{' '}
                      <span className="text-ink-soft">{log.action} a {log.entityType}</span>
                    </p>
                    <p className="text-[10px] text-ink-faint">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                    <Badge
                      status={log.entityType === 'member' ? 'warning' : log.entityType === 'project' ? 'success' : 'info'}
                      className="text-[10px] capitalize shrink-0 font-bold px-1.5 py-0.5 rounded"
                    >
                      {log.entityType}
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
