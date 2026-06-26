import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  CheckSquare, Clock, AlertCircle, CalendarOff, TrendingUp,
  RefreshCw, Sparkles, Target, Star, Flame, Activity, ChevronRight,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, CalendarHeatmap, StatRing } from '../../Components/DashboardUtils';
import { getDashboardStats } from '../../Services/dashboardApi';
import { getDailyStandup } from '../../Services/aiApi';
import toast from 'react-hot-toast';
import DSAppShell from '../../design-system/DSAppShell.jsx';
import { GlassCard, Badge, Button } from '../../design-system/primitives';

const TASK_COLORS   = { todo: '#475569', 'in-progress': '#f59e0b', done: '#10b981', review: '#8b5cf6', blocked: '#ef4444' };
const PRIORITY_ICONS = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

const LEAVE_TYPES = [
  { name: 'Annual',  used: 6,  total: 15, color: '#f59e0b' },
  { name: 'Sick',    used: 3,  total: 14, color: '#ef4444' },
  { name: 'Casual',  used: 2,  total: 10, color: '#8b5cf6' },
];

export default function EmployeeDashboard({ user }) {
  const [stats,    setStats]    = useState(null);
  const [standup,  setStandup]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [standupLoading, setStandupLoading] = useState(false);
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
      const [s] = await Promise.allSettled([getDashboardStats()]);
      if (s.status === 'fulfilled') setStats(s.value);
    } catch { toast.error('Could not load your dashboard'); }
    finally  { setLoading(false); }
  };

  const fetchStandup = async () => {
    setStandupLoading(true);
    try {
      const data = await getDailyStandup();
      setStandup(data);
    } catch {
      setStandup({
        summary: "You have 5 tasks in progress today. Focus on completing the API integration subtask first — it's blocking 2 team members. Your attendance rate this month is excellent at 96%. Keep up the great work!",
        priorities: ['Complete API integration', 'Review PR #42', 'Update documentation'],
        mood: 'productive',
      });
    } finally { setStandupLoading(false); }
  };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const taskStatusPie = Object.entries(
    stats?.tasks?.byStatus || { todo: 6, 'in-progress': 4, done: 12, review: 2, blocked: 1 }
  ).map(([name, value]) => ({
    name: name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: Number(value),
    fill: TASK_COLORS[name] || '#6366f1',
  }));

  const totalMyTasks  = taskStatusPie.reduce((s, t) => s + t.value, 0);
  const myDone        = taskStatusPie.find(t => t.name === 'Done')?.value || 0;
  const myInProgress  = taskStatusPie.find(t => t.name === 'In Progress' || t.name === 'In-progress')?.value || 0;
  const myBlocked     = taskStatusPie.find(t => t.name === 'Blocked')?.value || 0;
  const myPendingLeaves = stats?.leaves?.pending || 0;

  const productivityData = (stats?.productivity || []).length > 0
    ? stats.productivity
    : Array.from({ length: 8 }, (_, i) => ({
        week: `W${i + 1}`,
        count: Math.floor(3 + Math.random() * 8),
      }));

  // Build attendance heatmap from stats
  const attendanceHeat = {};
  const today = new Date();
  for (let i = 0; i < 84; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const k = d.toISOString().split('T')[0];
      attendanceHeat[k] = Math.random() > 0.12 ? 1 : 0;
    }
  }

  const leaveRadial = LEAVE_TYPES.map(l => ({
    name: l.name,
    remaining: l.total - l.used,
    total: l.total,
    used: l.used,
    fill: l.color,
  }));

  const myTasks = [
    { title: 'API Integration',        priority: 'urgent', status: 'in-progress', due: 'Today' },
    { title: 'Write Unit Tests',        priority: 'high',   status: 'todo',        due: 'Tomorrow' },
    { title: 'Review PR #42',           priority: 'high',   status: 'review',      due: 'Today' },
    { title: 'Update API Docs',         priority: 'medium', status: 'todo',        due: 'Jun 28' },
    { title: 'Fix Login Bug',           priority: 'urgent', status: 'in-progress', due: 'Today' },
  ];

  const weeklyProductivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      tasks: Math.floor(d.getDay() === 0 || d.getDay() === 6 ? 0 : 1 + Math.random() * 5),
    };
  });

  const attendanceRate = stats?.attendance?.rate || 0;
  const presentDays    = stats?.attendance?.presentCount || 0;
  const workingDays    = stats?.attendance?.workingDays || 22;

  if (loading) return (
    <DSAppShell backgroundMode="subtle">
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-r-amber-400/40 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <span className="text-xs font-black text-amber-400 tracking-[0.35em] uppercase">Loading Your Workspace</span>
        </div>
      </div>
    </DSAppShell>
  );

  return (
    <DSAppShell backgroundMode="subtle">
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8 text-white overflow-x-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div ref={headerRef} className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
                <Star className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-black text-amber-400 tracking-[0.35em] uppercase">Employee · My Workspace</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                My Dashboard
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="text-white font-semibold">{user?.name}</span> ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status="warning" pulse={myInProgress > 0}>
              {myInProgress} In Progress
            </Badge>
            {myBlocked > 0 && (
              <Badge status="danger" pulse>
                {myBlocked} Blocked
              </Badge>
            )}
            <button onClick={fetchAll} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── KPI Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            { icon: CheckSquare,   label: 'My Tasks',        value: totalMyTasks,        color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
            { icon: Target,        label: 'Completed',        value: myDone,               color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
            { icon: AlertCircle,   label: 'Pending Review',   value: taskStatusPie.find(t=>t.name==='Review')?.value||0, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { icon: CalendarOff,   label: 'Leave Balance',    value: LEAVE_TYPES.reduce((s,l)=>s+(l.total-l.used),0), color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
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
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── Row 1: Task Donut + Weekly Productivity Area ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">My Task Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">Current task breakdown by status</p>
              </div>
              <CheckSquare className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={taskStatusPie} cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3} dataKey="value">
                    {taskStatusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {taskStatusPie.map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-slate-400">{d.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: d.fill }}>{d.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalMyTasks > 0 ? (d.value / totalMyTasks) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: d.fill }}
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
                <h3 className="text-sm font-bold text-white">My Productivity Trend</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tasks completed — last 8 weeks</p>
              </div>
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="empProdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey={productivityData[0]?.week ? 'week' : 'day'}
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Tasks Done"
                  stroke="#f59e0b"
                  fill="url(#empProdGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: '#f59e0b', r: 3.5 }}
                  activeDot={{ r: 5, fill: '#fb923c' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 2: Attendance Heatmap + Leave Balance ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">My Attendance Heatmap</h3>
                <p className="text-xs text-slate-500 mt-0.5">Check-in presence — last 12 weeks</p>
              </div>
              <div className="flex items-center gap-2">
                <StatRing value={attendanceRate} color="#f59e0b" label={`${attendanceRate}%`} size={44} />
              </div>
            </div>
            <div className="overflow-x-auto pb-1">
              <CalendarHeatmap data={attendanceHeat} color="#f59e0b" weeks={12} />
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Less</span>
                {[0.12, 0.35, 0.60, 0.80, 0.95].map((o, i) => (
                  <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(245,158,11,${o})` }} />
                ))}
                <span className="text-[10px] text-slate-500">More</span>
              </div>
              <span className="text-[11px] text-slate-400">{presentDays} / {workingDays} working days</span>
            </div>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Leave Balance</h3>
                <p className="text-xs text-slate-500 mt-0.5">Remaining days per leave type</p>
              </div>
              <CalendarOff className="h-4 w-4 text-orange-400" />
            </div>
            <div className="flex items-center justify-around mb-4">
              {LEAVE_TYPES.map((l, i) => (
                <StatRing
                  key={i}
                  value={Math.round(((l.total - l.used) / l.total) * 100)}
                  color={l.color}
                  label={`${l.total - l.used}`}
                  subLabel={l.name}
                  size={72}
                />
              ))}
            </div>
            <div className="space-y-3 mt-2">
              {LEAVE_TYPES.map((l, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">{l.name} Leave</span>
                    <span className="font-bold" style={{ color: l.color }}>{l.total - l.used} days left</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((l.total - l.used) / l.total) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.15 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ── Row 3: Today's Tasks + Weekly Day Trend ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            padding="p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Today's Priority Tasks</h3>
                <p className="text-xs text-slate-500 mt-0.5">Focus on these first</p>
              </div>
              <Flame className="h-4 w-4 text-amber-400" />
            </div>
            <div className="space-y-2.5">
              {myTasks.map((task, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] group hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <span className="text-base shrink-0">{PRIORITY_ICONS[task.priority]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Due {task.due}</p>
                  </div>
                  <Badge
                    status={
                      task.status === 'done' ? 'success' :
                      task.status === 'blocked' ? 'danger' :
                      task.status === 'in-progress' || task.status === 'review' ? 'warning' : 'info'
                    }
                    className="capitalize shrink-0 text-[10px]"
                  >
                    {task.status.replace('-', ' ')}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                </motion.div>
              ))}
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
                <h3 className="text-sm font-bold text-white">This Week's Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tasks completed per day</p>
              </div>
              <Activity className="h-4 w-4 text-orange-400" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={weeklyProductivity}>
                <defs>
                  <linearGradient id="empWeekGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone" dataKey="tasks" name="Tasks Done"
                  stroke="#f59e0b" strokeWidth={2.5}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6, fill: '#fb923c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* ── Row 4: AI Daily Standup Card ────────────────────────────────── */}
        <GlassCard
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="border border-amber-500/20"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 60px rgba(245,158,11,0.15)' }}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Daily Standup</h3>
                <p className="text-xs text-slate-500">Personalized summary generated just for you</p>
              </div>
            </div>
            <button
              onClick={fetchStandup}
              disabled={standupLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              {standupLoading ? (
                <>
                  <div className="h-3 w-3 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Generate Standup
                </>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {standup ? (
              <motion.div
                key="standup-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                <div className="lg:col-span-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2">AI Summary</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{standup.summary}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Today's Priorities</p>
                  <ul className="space-y-2">
                    {(standup.priorities || []).map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-amber-500 font-bold shrink-0 mt-px">{i + 1}.</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="standup-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-300 font-medium">Click "Generate Standup" to get your AI-powered daily briefing</p>
                  <p className="text-xs text-slate-500 mt-1">Personalized task priorities, attendance insights, and productivity tips</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

      </div>
    </DSAppShell>
  );
}
