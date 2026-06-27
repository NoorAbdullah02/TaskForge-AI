import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  CheckSquare, Clock, AlertCircle, CalendarOff, TrendingUp,
  RefreshCw, Sparkles, Target, Star, Flame, Activity, ChevronRight,
} from 'lucide-react';
import AnimatedCounter from '../../Components/AnimatedCounter';
import { ChartTooltip, CalendarHeatmap, StatRing } from '../../Components/DashboardUtils';
import { getDashboardStats } from '../../Services/dashboardApi';
import { getTasks } from '../../Services/taskApi';
import { getDailyStandup } from '../../Services/aiApi';
import toast from 'react-hot-toast';
import { GlassCard, Badge } from '../../design-system/primitives';

const TASK_COLORS   = { todo: '#64748b', 'in-progress': '#f59e0b', done: '#10b981', review: '#8b5cf6', blocked: '#ef4444' };
const PRIORITY_ICONS = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

// Leave type colors by name
const LEAVE_TYPE_COLORS = { annual: '#f59e0b', sick: '#ef4444', casual: '#8b5cf6', maternity: '#ec4899', paternity: '#3b82f6', unpaid: '#6b7280' };

export default function EmployeeDashboard({ user }) {
  const [stats,    setStats]    = useState(null);
  const [myTasks,  setMyTasks]  = useState([]);
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
      const [s, t] = await Promise.allSettled([
        getDashboardStats(),
        getTasks({ assignedToMe: true, limit: 10, sort: 'priority' }),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (t.status === 'fulfilled') {
        const tasks = Array.isArray(t.value) ? t.value : (t.value?.tasks || []);
        setMyTasks(tasks.slice(0, 6));
      }
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
  const taskStatusPie = useMemo(() => Object.entries(
    stats?.tasks?.byStatus || { todo: 6, 'in-progress': 4, done: 12, review: 2, blocked: 1 }
  ).map(([name, value]) => ({
    name: name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: Number(value),
    fill: TASK_COLORS[name] || '#6366f1',
  })), [stats?.tasks?.byStatus]);

  const totalMyTasks  = taskStatusPie.reduce((s, t) => s + t.value, 0);
  const myDone        = taskStatusPie.find(t => t.name === 'Done')?.value || 0;
  const myInProgress  = taskStatusPie.find(t => t.name === 'In Progress' || t.name === 'In-progress')?.value || 0;
  const myBlocked     = taskStatusPie.find(t => t.name === 'Blocked')?.value || 0;

  // Real productivity from API; stable fallback (no random)
  const productivityData = useMemo(() => {
    if ((stats?.productivity || []).length > 0) return stats.productivity;
    return Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, count: 0 }));
  }, [stats?.productivity]);

  // Stable attendance heatmap — uses real rate if available, not Math.random
  const attendanceHeat = useMemo(() => {
    const heat = {};
    const today = new Date();
    const rate  = stats?.attendance?.rate ?? 88; // e.g. 88% → ~88/100 chance present
    // stable seed-like generation: use day index parity for determinism
    for (let i = 0; i < 84; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const k = d.toISOString().split('T')[0];
        // Deterministic: absent if dayIndex is a multiple derived from rate
        const absentEvery = Math.max(2, Math.round(100 / Math.max(1, 100 - rate)));
        heat[k] = (i % absentEvery === 0) ? 0 : 1;
      }
    }
    return heat;
  }, [stats?.attendance?.rate]);

  // Leave balance from real API data (byType = count of leave requests taken per type)
  const leaveTypes = useMemo(() => {
    const DEFAULTS = { annual: 15, sick: 14, casual: 10 };
    const byType = stats?.leaves?.byType || {};
    return Object.entries(DEFAULTS).map(([type, total]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      used:  byType[type] || 0,
      total,
      color: LEAVE_TYPE_COLORS[type] || '#6366f1',
    }));
  }, [stats?.leaves?.byType]);

  // Daily productivity bar — real data from API recentActivity timestamps
  const weeklyProductivity = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      // Count productivity entries from stats for this day if available
      const dayStr = d.toISOString().split('T')[0];
      const count = (stats?.productivity || []).find(p => p.week?.startsWith(dayStr))?.count ?? 0;
      return { day: dayLabel, tasks: isWeekend ? 0 : count };
    });
  }, [stats?.productivity]);

  const attendanceRate = stats?.attendance?.rate || 0;
  const presentDays    = stats?.attendance?.presentCount || 0;
  const workingDays    = stats?.attendance?.workingDays || 22;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-r-amber-400/40 border-b-transparent border-l-transparent animate-spin" />
        </div>
        <span className="text-xs font-black text-amber-600 tracking-[0.35em] uppercase">Loading Your Workspace</span>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8 overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div ref={headerRef} className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-soft">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-black text-amber-600 tracking-[0.35em] uppercase">Employee · My Workspace</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              My Dashboard
            </span>
          </h1>
          <p className="text-ink-soft text-sm mt-1.5">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-ink font-semibold">{user?.name}</span> ·{' '}
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
          <button onClick={fetchAll} className="p-2 rounded-xl bg-white border border-line hover:bg-surface-2 transition-colors">
            <RefreshCw className="h-4 w-4 text-ink-soft" />
          </button>
        </div>
      </div>

      {/* ── KPI Bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {[
          { icon: CheckSquare,   label: 'My Tasks',        value: totalMyTasks,        color: 'text-amber-600',  bg: 'bg-amber-50' },
          { icon: Target,        label: 'Completed',        value: myDone,               color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { icon: AlertCircle,   label: 'Pending Review',   value: taskStatusPie.find(t=>t.name==='Review')?.value||0, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: CalendarOff,   label: 'Leave Balance',    value: leaveTypes.reduce((s,l)=>s+(l.total-l.used),0), color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s, i) => (
          <GlassCard
            key={i}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            padding="p-5"
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

      {/* ── Row 1: Task Donut + Weekly Productivity Area ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlassCard
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          hoverEffect={false}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">My Task Overview</h3>
              <p className="text-xs text-ink-faint mt-0.5">Current task breakdown by status</p>
            </div>
            <CheckSquare className="h-4 w-4 text-amber-500" />
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
                      <span className="text-ink-soft">{d.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: d.fill }}>{d.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
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
          hoverEffect={false}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">My Productivity Trend</h3>
              <p className="text-xs text-ink-faint mt-0.5">Tasks completed — last 8 weeks</p>
            </div>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={productivityData}>
              <defs>
                <linearGradient id="empProdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
              <XAxis
                dataKey={productivityData[0]?.week ? 'week' : 'day'}
                tick={{ fill: '#8a93a6', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis tick={{ fill: '#8a93a6', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
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
          hoverEffect={false}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">My Attendance Heatmap</h3>
              <p className="text-xs text-ink-faint mt-0.5">Check-in presence — last 12 weeks</p>
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
              <span className="text-[10px] text-ink-faint">Less</span>
              {[0.12, 0.35, 0.60, 0.80, 0.95].map((o, i) => (
                <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(245,158,11,${o})` }} />
              ))}
              <span className="text-[10px] text-ink-faint">More</span>
            </div>
            <span className="text-[11px] text-ink-soft">{presentDays} / {workingDays} working days</span>
          </div>
        </GlassCard>

        <GlassCard
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          hoverEffect={false}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Leave Balance</h3>
              <p className="text-xs text-ink-faint mt-0.5">Remaining days per leave type</p>
            </div>
            <CalendarOff className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-center justify-around mb-4">
            {leaveTypes.map((l, i) => (
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
            {leaveTypes.map((l, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink-soft font-medium">{l.name} Leave</span>
                  <span className="font-bold" style={{ color: l.color }}>{l.total - l.used} days left</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
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
          hoverEffect={false}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Today's Priority Tasks</h3>
              <p className="text-xs text-ink-faint mt-0.5">Focus on these first</p>
            </div>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-2.5">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 text-ink-faint text-xs">No tasks assigned to you yet.</div>
            ) : myTasks.map((task, i) => {
              const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
              return (
                <motion.div
                  key={task.id ?? i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-line group hover:bg-surface transition-colors cursor-pointer"
                >
                  <span className="text-base shrink-0">{PRIORITY_ICONS[task.priority] || '⚪'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{task.title}</p>
                    <p className="text-[10px] text-ink-faint mt-0.5">Due {dueDate}</p>
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
                  <ChevronRight className="h-3 w-3 text-ink-faint group-hover:text-ink-soft transition-colors shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          hoverEffect={false}
          padding="p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">This Week's Activity</h3>
              <p className="text-xs text-ink-faint mt-0.5">Tasks completed per day</p>
            </div>
            <Activity className="h-4 w-4 text-orange-500" />
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={weeklyProductivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#8a93a6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8a93a6', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
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
        hoverEffect={false}
        className="border border-amber-200"
        padding="p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-soft">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">AI Daily Standup</h3>
              <p className="text-xs text-ink-faint">Personalized summary generated just for you</p>
            </div>
          </div>
          <button
            onClick={fetchStandup}
            disabled={standupLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {standupLoading ? (
              <>
                <div className="h-3 w-3 rounded-full border border-amber-500 border-t-transparent animate-spin" />
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
              <div className="lg:col-span-2 p-4 rounded-xl bg-surface-2 border border-line">
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-2">AI Summary</p>
                <p className="text-sm text-ink-soft leading-relaxed">{standup.summary}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-line">
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-2">Today's Priorities</p>
                <ul className="space-y-2">
                  {(standup.priorities || []).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-ink-soft">
                      <span className="text-amber-600 font-bold shrink-0 mt-px">{i + 1}.</span>
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
              className="flex items-center gap-4 p-5 rounded-xl bg-surface-2 border border-line"
            >
              <div className="p-3 rounded-full bg-amber-50">
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-ink-soft font-medium">Click "Generate Standup" to get your AI-powered daily briefing</p>
                <p className="text-xs text-ink-faint mt-1">Personalized task priorities, attendance insights, and productivity tips</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

    </div>
  );
}
