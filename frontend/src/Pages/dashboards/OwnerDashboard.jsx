import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, Briefcase, CheckSquare, CalendarOff, TrendingUp, Activity,
  Building2, RefreshCw, BarChart3, Clock, Layers, Check, X,
  UserCheck, ChevronRight, Settings, Crown, Shield,
  Copy, Link, Timer, Play,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, CalendarHeatmap } from '../../Components/DashboardUtils';
import { getDashboardStats } from '../../Services/dashboardApi';
import { getProjects } from '../../Services/projectApi';
import { getWorkspaceInfo } from '../../Services/workspaceApi';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GlassCard, Badge, Button } from '../../design-system/primitives';
import PendingReviewPanel from '../../Components/PendingReviewPanel';
import { socket } from '../../Services/socket';

const PROJECT_STATUS_COLORS = {
  planning: '#94a3b8', active: '#8b5cf6', in_progress: '#a855f7',
  on_hold: '#f59e0b', completed: '#10b981',
};
const PRIORITY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
const LEAVE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OwnerDashboard({ user }) {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [, setProjects] = useState([]);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [copiedType, setCopiedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState({});
  const headerRef = useRef(null);
  const liveTickRef = useRef(null);

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success(`${type} copied to clipboard! 📋`);
    setTimeout(() => setCopiedType(''), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, w] = await Promise.allSettled([
        getDashboardStats(),
        getProjects(),
        getWorkspaceInfo()
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (p.status === 'fulfilled') setProjects(p.value || []);
      if (w.status === 'fulfilled') setWorkspaceInfo(w.value);
    } catch {
      toast.error('Could not load workspace data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Live-tick active timers every second. Reseeds/restarts only when the
  // *set* of active timer IDs changes (a timer starting/stopping), not on
  // every stats refetch — otherwise a socket-triggered refetch would reset
  // the displayed elapsed time and cause a visible jump.
  const activeTimersRef = useRef([]);
  useEffect(() => {
    activeTimersRef.current = stats?.activeTimers || [];
  }, [stats?.activeTimers]);

  const activeTimerIdsKey = (stats?.activeTimers || []).map(t => t.id).sort().join(',');

  useEffect(() => {
    const activeTimers = activeTimersRef.current;
    if (activeTimers.length === 0) {
      setLiveSeconds({});
      return;
    }

    setLiveSeconds(prev => {
      const next = {};
      activeTimers.forEach(t => {
        next[t.id] = t.id in prev ? prev[t.id] : (t.elapsedSeconds || 0);
      });
      return next;
    });

    liveTickRef.current = setInterval(() => {
      setLiveSeconds(prev => {
        const next = { ...prev };
        activeTimersRef.current.forEach(t => { next[t.id] = (next[t.id] || 0) + 1; });
        return next;
      });
    }, 1000);

    return () => clearInterval(liveTickRef.current);
  }, [activeTimerIdsKey]);

  // Refresh when a timer starts/stops (real-time)
  useEffect(() => {
    const handle = (data) => {
      if (data.action === 'timer_started' || data.action === 'timer_stopped') {
        fetchAll();
      }
    };
    socket.on('task_updated', handle);
    return () => socket.off('task_updated', handle);
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [s, p, w] = await Promise.allSettled([
        getDashboardStats(),
        getProjects(),
        getWorkspaceInfo()
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (p.status === 'fulfilled') setProjects(p.value || []);
      if (w.status === 'fulfilled') setWorkspaceInfo(w.value);
      toast.success('Dashboard refreshed');
    } catch {
      toast.error('Could not refresh workspace data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && headerRef.current) {
      gsap.from([...headerRef.current.children], {
        y: -28, opacity: 0, stagger: 0.1, duration: 0.85, ease: 'power3.out',
      });
    }
  }, [loading]);


  // ── Chart data ──────────────────────────────────────────────────────────────
  const projectsByStatus = Object.entries(stats?.projects?.byStatus || {})
    .map(([name, value]) => ({ name, value: Number(value), color: PROJECT_STATUS_COLORS[name] || '#6366f1' }));

  const taskByPriority = Object.entries(stats?.tasks?.byPriority || {})
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Number(value) }));

  const productivityData = (stats?.productivity || []).slice(-8);

  const leaveData = Object.entries(stats?.leaves?.byStatus || {})
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Number(value) }));

  const taskStatusData = Object.entries(stats?.tasks?.byStatus || {})
    .map(([name, value]) => ({ name: name.replace('_', ' '), value: Number(value) }));

  const recentActivity = (stats?.recentActivity || []).slice(0, 12);

  const activeMembers = stats?.workspace?.activeMembers || 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-r-violet-400/40 border-b-transparent border-l-transparent animate-spin" />
        </div>
        <span className="text-xs font-black text-violet-400 tracking-[0.3em] uppercase">Loading Workspace</span>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 text-ink overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div ref={headerRef} className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-gradient-owner shadow-lg shadow-glow-teal">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-black text-teal-600 tracking-[0.35em] uppercase">
              {authUser?.workspaceName || 'Workspace'} · Owner
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            <span className="bg-gradient-owner bg-clip-text text-transparent">
              Workspace Dashboard
            </span>
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            Welcome back, <span className="text-ink font-semibold">{user?.name}</span> ·{' '}
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/admin-settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-surface-2 border border-line hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-ink-soft ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <PendingReviewPanel
        reviewQueue={stats?.tasks?.reviewQueue || []}
        pendingReview={stats?.tasks?.pendingReview || 0}
        onActionDone={fetchAll}
      />

      {/* ── Live Active Timers ───────────────────────────────────────── */}
      {(stats?.activeTimers?.length > 0) && (
        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          padding="p-5"
          className="mb-6 border border-emerald-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15">
                <Timer className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Active Timers — Live</h3>
                <p className="text-xs text-ink-faint mt-0.5">Employees currently tracking time</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              {stats.activeTimers.length} Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.activeTimers.map(t => {
              const secs = liveSeconds[t.id] ?? t.elapsedSeconds ?? 0;
              const h = Math.floor(secs / 3600);
              const m = Math.floor((secs % 3600) / 60);
              const s = secs % 60;
              const display = h > 0
                ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 hover:border-emerald-500/40 cursor-pointer transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink truncate group-hover:text-emerald-400 transition-colors">{t.title}</p>
                    <p className="text-[10px] text-ink-faint mt-0.5 truncate">{t.assigneeName || 'Unassigned'} · {t.projectName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-400 font-mono tabular-nums">{display}</p>
                    <p className="text-[9px] text-emerald-600 font-semibold">tracking</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Pending Work Logs & Timesheets Review Panel ───────────────────────────── */}
      {(stats?.pendingWorkLogs?.length > 0 || stats?.pendingTimesheets?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
          {/* Pending Work Logs */}
          {stats?.pendingWorkLogs?.length > 0 && (
            <GlassCard padding="p-6" className="border border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    Work Logs Awaiting Review
                  </h3>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {stats.pendingWorkLogs.length} work log{stats.pendingWorkLogs.length === 1 ? '' : 's'} submitted by your team
                  </p>
                </div>
                <Badge status="warning">{stats.pendingWorkLogs.length}</Badge>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {stats.pendingWorkLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => navigate('/work-log')}
                    className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2 border border-line hover:border-amber-500/30 transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{log.title}</p>
                      <p className="text-[11px] text-ink-faint mt-0.5 truncate">
                        {log.userName} · {log.logDate} · {log.hoursWorked} hrs
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-amber-400 shrink-0" />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Pending Timesheets */}
          {stats?.pendingTimesheets?.length > 0 && (
            <GlassCard padding="p-6" className="border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-400" />
                    Timesheets Awaiting Review
                  </h3>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {stats.pendingTimesheets.length} timesheet{stats.pendingTimesheets.length === 1 ? '' : 's'} submitted for approval
                  </p>
                </div>
                <Badge status="info">{stats.pendingTimesheets.length}</Badge>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {stats.pendingTimesheets.map((ts) => (
                  <div
                    key={ts.id}
                    onClick={() => navigate('/timesheet')}
                    className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2 border border-line hover:border-blue-500/30 transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{ts.userName}'s Timesheet</p>
                      <p className="text-[11px] text-ink-faint mt-0.5 truncate">
                        {ts.periodType} · {ts.periodStart} to {ts.periodEnd} · {ts.totalHours} hrs
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-blue-400 shrink-0" />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── Workspace Access & Quick Invite Panel ───────────────────────────── */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <GlassCard padding="p-0" className="border border-purple-500/20 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line">
              <div className="lg:col-span-12 p-5 bg-purple-500/[0.02] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/15">
                      <Link className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">Invite Team Members</h3>
                      <p className="text-xs text-ink-faint">Share link or code to add members; invite-code joins are auto-approved.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-ink-faint tracking-wider uppercase mb-1">Invite Link</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={workspaceInfo?.inviteLink || 'Loading link…'}
                          className="flex-1 min-w-0 px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-mono text-ink-soft select-all focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(workspaceInfo?.inviteLink, 'Link')}
                          disabled={!workspaceInfo?.inviteLink}
                          className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>{copiedType === 'Link' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-ink-faint tracking-wider uppercase mb-1">Invite Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={workspaceInfo?.inviteCode || '…'}
                            className="w-full text-center px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-mono font-bold text-purple-400 select-all focus:outline-none"
                          />
                          <button
                            onClick={() => handleCopy(workspaceInfo?.inviteCode, 'Code')}
                            disabled={!workspaceInfo?.inviteCode}
                            className="px-2.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          onClick={() => navigate('/admin-settings?tab=invite')}
                          className="w-full py-2 px-3 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:border-ink-soft transition-all text-center flex items-center justify-center gap-1 cursor-pointer h-[34px]"
                        >
                          <span>Settings Link</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-xs text-ink-faint">
                  <span>Total Workspace Members:</span>
                  <span className="font-bold text-ink">{workspaceInfo?.memberCount || 1}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      {/* ── KPI Bar ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Briefcase, label: 'Active Projects', value: stats?.projects?.active || 0, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          { icon: CheckSquare, label: 'Total Tasks', value: stats?.tasks?.total || 0, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { icon: Users, label: 'Active Members', value: activeMembers, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { icon: CalendarOff, label: 'Pending Leaves', value: stats?.leaves?.pending || 0, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          { icon: Clock, label: 'Attendance Rate', value: stats?.attendance?.rate || 0, suffix: '%', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map((s, i) => (
          <GlassCard
            key={i}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className={`p-4 border ${s.border}`}
            hoverEffect
          >
            <div className={`p-1.5 rounded-lg ${s.bg} w-fit mb-2.5`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <AnimatedCounter value={s.value} suffix={s.suffix || ''} className={`text-2xl font-black block ${s.color}`} />
            <p className="text-[11px] text-ink-faint mt-0.5 leading-tight">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Row 1: Project Status + Weekly Productivity ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Project Status Distribution</h3>
              <p className="text-xs text-ink-faint mt-0.5">Workspace-wide project health</p>
            </div>
            <Briefcase className="h-4 w-4 text-violet-400" />
          </div>
          {projectsByStatus.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="45%" height={190}>
                <PieChart>
                  <Pie data={projectsByStatus} cx="50%" cy="50%" outerRadius={78} innerRadius={42} paddingAngle={3} dataKey="value">
                    {projectsByStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {projectsByStatus.map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-soft capitalize">{d.name.replace(/_/g, ' ')}</span>
                      <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.value / Math.max(...projectsByStatus.map(x => x.value), 1)) * 100}%` }}
                        transition={{ duration: 0.7, delay: i * 0.08 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[190px] text-ink-faint text-sm">
              No projects yet
            </div>
          )}
        </GlassCard>

        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Weekly Productivity</h3>
              <p className="text-xs text-ink-faint mt-0.5">Tasks completed per week</p>
            </div>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={productivityData}>
              <defs>
                <linearGradient id="owProdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" name="Tasks Done" stroke="#8b5cf6" fill="url(#owProdGrad)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* ── Row 2: Task Priority + Leave Analytics ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Task Priority Breakdown</h3>
              <p className="text-xs text-ink-faint mt-0.5">Current task distribution by urgency</p>
            </div>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          {taskByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskByPriority} layout="vertical" barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Tasks" radius={[0, 5, 5, 0]}>
                  {taskByPriority.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-ink-faint text-sm">No task data yet</div>
          )}
        </GlassCard>

        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Leave Analytics</h3>
              <p className="text-xs text-ink-faint mt-0.5">Leave requests by status</p>
            </div>
            <CalendarOff className="h-4 w-4 text-fuchsia-400" />
          </div>
          {leaveData.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-[200px] text-ink-faint text-sm">No leave data yet</div>
          )}
        </GlassCard>
      </div>

      {/* ── Row 3: Task Status + Recent Activity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Task Status Overview</h3>
              <p className="text-xs text-ink-faint mt-0.5">All workspace tasks by status</p>
            </div>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskStatusData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Tasks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-ink-faint text-sm">No task data yet</div>
          )}
        </GlassCard>

        <GlassCard
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Workspace Activity</h3>
              <p className="text-xs text-ink-faint mt-0.5">Recent events</p>
            </div>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="space-y-2 max-h-[248px] overflow-y-auto pr-0.5">
            {recentActivity.length === 0 ? (
              <div className="text-center text-ink-faint text-sm py-8">No recent activity</div>
            ) : recentActivity.map((log, i) => (
              <motion.div
                key={log.id ?? i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-2 border border-line"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-black shrink-0 text-white">
                  {(log.userName || 'U').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-ink-soft truncate">
                    <span className="font-semibold text-ink">{log.userName || 'System'}</span>{' '}
                    <span className="lowercase">{log.action?.toLowerCase().replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-[10px] text-ink-faint">{log.createdAt ? timeAgo(log.createdAt) : ''}</p>
                </div>
                <span className="text-[10px] font-semibold text-ink-faint capitalize shrink-0 hidden sm:block">
                  {log.entityType}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <GlassCard
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        padding="p-5"
      >
        <h3 className="text-sm font-bold text-ink mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Manage Members', icon: Users, color: 'from-violet-500 to-purple-600', to: '/admin-settings' },
            { label: 'View Projects', icon: Briefcase, color: 'from-blue-500 to-indigo-600', to: '/projects' },
            { label: 'Leave Requests', icon: CalendarOff, color: 'from-amber-500 to-orange-600', to: '/leaves' },
            { label: 'Reports', icon: BarChart3, color: 'from-emerald-500 to-teal-600', to: '/reports' },
          ].map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.to)}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-2 border border-line hover:border-brand/30 hover:bg-brand/5 transition-all group"
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${a.color} shadow-sm shrink-0`}>
                <a.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-ink-soft group-hover:text-ink transition-colors">{a.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-ink-faint ml-auto group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </GlassCard>

    </div>
  );
}
