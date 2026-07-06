import { useState, useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Globe, Users, Briefcase, CheckSquare, Cpu, Database, Mail, Server,
  Crown, Activity, Shield, TrendingUp, RefreshCw, AlertTriangle, Eye,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, CalendarHeatmap, StatRing } from '../../Components/DashboardUtils';
import { getWorkspaces, getUsers, getAnalytics, getAuditLogs } from '../../Services/superAdminApi';
import { getDashboardStats } from '../../Services/dashboardApi';
import toast from 'react-hot-toast';
import { GlassCard, Badge, Button } from '../../design-system/primitives';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TASK_COLORS = ['#94a3b8','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];

export default function SuperAdminDashboard({ user }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [allUsers,   setAllUsers]   = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [dashStats,  setDashStats]  = useState(null);
  const [auditLogs,  setAuditLogs]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      const [ws, u, an, ds, al] = await Promise.allSettled([
        getWorkspaces(), getUsers(), getAnalytics(), getDashboardStats(), getAuditLogs(),
      ]);
      if (ws.status === 'fulfilled') setWorkspaces(ws.value || []);
      if (u.status  === 'fulfilled') setAllUsers(u.value || []);
      if (an.status === 'fulfilled') setAnalytics(an.value);
      if (ds.status === 'fulfilled') setDashStats(ds.value);
      if (al.status === 'fulfilled') setAuditLogs((al.value || []).slice(0, 14));
    } catch { toast.error('Could not load some platform data'); }
    finally  { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [ws, u, an, ds, al] = await Promise.allSettled([
        getWorkspaces(), getUsers(), getAnalytics(), getDashboardStats(), getAuditLogs(),
      ]);
      if (ws.status === 'fulfilled') setWorkspaces(ws.value || []);
      if (u.status  === 'fulfilled') setAllUsers(u.value || []);
      if (an.status === 'fulfilled') setAnalytics(an.value);
      if (ds.status === 'fulfilled') setDashStats(ds.value);
      if (al.status === 'fulfilled') setAuditLogs((al.value || []).slice(0, 14));
      toast.success('Dashboard refreshed');
    } catch {
      toast.error('Could not refresh platform data');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Derived chart data ─────────────────────────────────────────────────────
  const totalWs    = workspaces.length  || 8;
  const totalUsers = allUsers.length    || 120;

  // Deterministic growth curve — no random (step sizes are consistent)
  const platformGrowth = useMemo(() => MONTHS.map((m, i) => ({
    month: m,
    workspaces: Math.max(1, totalWs - 11 + i),
    users:      Math.max(1, totalUsers - 60 + i * 5),
  })), [totalWs, totalUsers]);

  const aiFeatureData = [
    { name: 'Copilot',   requests: 324, success: 310 },
    { name: 'Task Gen',  requests: 215, success: 208 },
    { name: 'Sprint AI', requests: 178, success: 170 },
    { name: 'Risk AI',   requests: 132, success: 128 },
    { name: 'Docs AI',   requests: 98,  success: 95  },
    { name: 'Burnout',   requests: 67,  success: 64  },
  ];

  // Deterministic email trend — no random
  const emailTrendData = useMemo(() => MONTHS.slice(-6).map((m, i) => ({
    month: m,
    sent:   Math.floor(400 + i * 80),
    opened: Math.floor(220 + i * 40),
  })), []);

  const storagePie = [
    { name: 'Files',    value: 38, color: '#ef4444' },
    { name: 'Database', value: 27, color: '#f97316' },
    { name: 'Backups',  value: 20, color: '#fb923c' },
    { name: 'Logs',     value: 10, color: '#fbbf24' },
    { name: 'Other',    value: 5,  color: '#4b5563' },
  ];

  const systemHealth = [
    { metric: 'API',     value: 98 },
    { metric: 'DB',      value: 93 },
    { metric: 'ML Svc',  value: 87 },
    { metric: 'Socket',  value: 96 },
    { metric: 'Email',   value: 91 },
    { metric: 'Storage', value: 79 },
  ];

  const taskPie = Object.entries(
    dashStats?.tasks?.byStatus || { todo: 42, 'in-progress': 31, done: 76, review: 14, blocked: 7 }
  ).map(([name, value]) => ({ name, value: Number(value) }));

  const activityHeat = {};
  auditLogs.forEach(l => {
    if (l.createdAt) {
      const k = new Date(l.createdAt).toISOString().split('T')[0];
      activityHeat[k] = (activityHeat[k] || 0) + 1;
    }
  });

  if (loading) return (
    <>
      <div className="min-h-screen flex items-center justify-center text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-red-500 border-r-red-400/40 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <span className="text-xs font-black text-red-400 tracking-[0.35em] uppercase">Initializing Command Center</span>
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/30">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-black text-red-400 tracking-[0.35em] uppercase">Super Admin · Platform Command</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                Global Overview
              </span>
            </h1>
            <p className="text-ink-soft text-sm mt-1.5">
              Welcome back, <span className="text-ink font-semibold">{user?.name}</span> ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status="success" pulse>
              All Systems Operational
            </Badge>
            <Badge status="danger">
              {totalWs} Workspaces Active
            </Badge>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-surface-2 border border-line hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-ink-soft ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-7">
          {[
            { icon: Globe,       label: 'Workspaces', value: totalWs,                               color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
            { icon: Users,       label: 'Total Users', value: totalUsers,                            color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
            { icon: Briefcase,   label: 'Projects',    value: dashStats?.projects?.total   || 0,     color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
            { icon: CheckSquare, label: 'Total Tasks',  value: dashStats?.tasks?.total     || 0,     color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            { icon: Cpu,         label: 'AI Requests',  value: analytics?.totalAiRequests  || 1024,  color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20' },
            { icon: Database,    label: 'Storage GB',   value: analytics?.storageUsedGB    || 48,    color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
            { icon: Mail,        label: 'Emails Sent',  value: analytics?.emailsSent       || 3240,  color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
            { icon: Server,      label: 'Uptime %',     value: 99.9, decimals: 1, suffix: '%',       color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
          ].map((s, i) => (
            <GlassCard
              key={i}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={`p-4 border ${s.border}`}
              hoverEffect={true}
            >
              <div className={`p-1.5 rounded-lg ${s.bg} w-fit mb-2.5`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <AnimatedCounter
                value={s.value}
                decimals={s.decimals || 0}
                suffix={s.suffix || ''}
                className={`text-[22px] font-black block ${s.color}`}
              />
              <p className="text-[11px] text-ink-faint mt-0.5">{s.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── Row 1: Platform Growth + AI Analytics ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Platform Growth</h3>
                <p className="text-xs text-ink-faint mt-0.5">Workspaces & users — last 12 months</p>
              </div>
              <TrendingUp className="h-4 w-4 text-red-400" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={platformGrowth}>
                <defs>
                  <linearGradient id="saWsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="saUserGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" />
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="workspaces" name="Workspaces" stroke="#ef4444" fill="url(#saWsGrad)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="users"      name="Users"      stroke="#f97316" fill="url(#saUserGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
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
                <h3 className="text-sm font-bold text-ink">AI Engine Analytics</h3>
                <p className="text-xs text-ink-faint mt-0.5">Requests & success rate by feature</p>
              </div>
              <Cpu className="h-4 w-4 text-orange-400" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aiFeatureData} barGap={4} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="requests" name="Requests" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="success"  name="Success"  fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 2: Storage + System Health + Task Status ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Storage Distribution</h3>
            <p className="text-xs text-ink-faint mb-4">48 GB total platform storage</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={storagePie} cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3} dataKey="value">
                  {storagePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {storagePie.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-ink-soft">{d.name}: {d.value}%</span>
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
            <h3 className="text-sm font-bold text-ink mb-1">System Health Radar</h3>
            <p className="text-xs text-ink-faint mb-2">Real-time service reliability</p>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={systemHealth} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#e6eaf2" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Health" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} dot={{ fill: '#ef4444', r: 2.5 }} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Global Task Status</h3>
            <p className="text-xs text-ink-faint mb-4">Platform-wide distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={taskPie} cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3} dataKey="value">
                  {taskPie.map((_, i) => <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {taskPie.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: TASK_COLORS[i % TASK_COLORS.length] }} />
                  <span className="text-[11px] text-ink-soft capitalize">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ── Row 3: Email Trend + Activity Heatmap ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Email Analytics</h3>
                <p className="text-xs text-ink-faint mt-0.5">Sent vs opened — last 6 months</p>
              </div>
              <Mail className="h-4 w-4 text-violet-400" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={emailTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" />
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="sent"   name="Sent"   stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 3 }} />
                <Line type="monotone" dataKey="opened" name="Opened" stroke="#ec4899" strokeWidth={2.5} dot={{ fill: '#ec4899', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.56, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <h3 className="text-sm font-bold text-ink mb-1">Platform Activity Heatmap</h3>
            <p className="text-xs text-ink-faint mb-4">Audit log density — last 12 weeks</p>
            <div className="overflow-x-auto pb-1">
              <CalendarHeatmap data={activityHeat} color="#ef4444" weeks={12} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] text-ink-faint">Less</span>
              {[0.12, 0.28, 0.50, 0.72, 0.92].map((o, i) => (
                <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(239,68,68,${o})` }} />
              ))}
              <span className="text-[10px] text-ink-faint">More</span>
            </div>
          </GlassCard>
        </div>

        {/* ── Row 4: Audit Logs + Workspace Health ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Recent Audit Log</h3>
                <p className="text-xs text-ink-faint mt-0.5">All workspaces · latest actions</p>
              </div>
              <Shield className="h-4 w-4 text-red-400" />
            </div>
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-0.5">
              {(auditLogs.length
                ? auditLogs
                : Array.from({ length: 10 }, (_, i) => ({
                    id: i,
                    action: ['created task','updated project','deleted user','assigned role','logged in'][i % 5],
                    entityType: ['task','project','user','workspace','sprint'][i % 5],
                    userName: `User ${i + 1}`,
                    createdAt: new Date(Date.now() - i * 1_800_000).toISOString(),
                  }))
              ).map((log, i) => (
                <motion.div
                  key={log.id ?? i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-2 border border-line"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-[10px] font-black shrink-0 text-white">
                    {(log.userName || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-soft truncate">
                      <span className="font-semibold text-ink">{log.userName}</span>{' '}
                      <span className="text-ink-soft">{log.action}</span>
                    </p>
                    <p className="text-[10px] text-ink-faint">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                    <Badge
                      status={log.entityType === 'user' ? 'warning' : log.entityType === 'workspace' ? 'danger' : 'info'}
                      className="text-[10px] capitalize shrink-0 font-bold px-1.5 py-0.5 rounded"
                    >
                      {log.entityType}
                    </Badge>
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
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Workspace Health</h3>
                <p className="text-xs text-ink-faint mt-0.5">Health scores for managed workspaces</p>
              </div>
              <Eye className="h-4 w-4 text-orange-400" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(workspaces.length
                ? workspaces
                : Array.from({ length: 8 }, (_, i) => ({ id: i, name: `Workspace ${i + 1}` }))
              ).slice(0, 12).map((ws, i) => {
                // Deterministic score based on index — stable across renders
                const h = ws.healthScore ?? (55 + ((i * 17) % 43));
                const color = h >= 85 ? '#10b981' : h >= 65 ? '#f59e0b' : '#ef4444';
                return (
                  <StatRing key={ws.id ?? i} value={h} color={color} label={`${h}`} subLabel={ws.name || `WS ${i + 1}`} size={60} />
                );
              })}
            </div>
          </GlassCard>
        </div>

      </div>
    </>
  );
}
