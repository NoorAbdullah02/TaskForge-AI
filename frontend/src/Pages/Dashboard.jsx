import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
    Briefcase, CheckSquare, Clock, CalendarOff, TrendingUp, Activity,
    Users, AlertCircle, Loader2
} from 'lucide-react';
import { getDashboardStats } from '../Services/dashboardApi';

// Color palettes
const TASK_STATUS_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];
const PRIORITY_COLORS = { low: '#10b981', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
const PROJECT_STATUS_COLORS = { planning: '#94a3b8', active: '#3b82f6', in_progress: '#8b5cf6', on_hold: '#f59e0b', completed: '#10b981' };
const LEAVE_STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const LEAVE_TYPE_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
    })
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Loading skeleton
const SkeletonCard = () => (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>
);

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const data = await getDashboardStats();
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // ─── Overview Tab ────────────────────────────────────────────
    const OverviewTab = () => {
        if (!stats || !stats.projects || !stats.tasks || !stats.attendance || !stats.leaves) return null;

        const heroCards = [
            { icon: Briefcase, label: 'Active Projects', value: stats.projects.active, total: `${stats.projects.total} total`, color: 'from-emerald-500 to-teal-600' },
            { icon: CheckSquare, label: 'Total Tasks', value: stats.tasks.total, total: `${stats.tasks.byStatus?.done || 0} done`, color: 'from-blue-500 to-indigo-600' },
            { icon: Clock, label: 'Attendance Rate', value: `${stats.attendance.rate}%`, total: `${stats.attendance.presentCount + stats.attendance.lateCount} / ${stats.attendance.workingDays} days`, color: 'from-violet-500 to-purple-600' },
            { icon: CalendarOff, label: 'Pending Leaves', value: stats.leaves.pending, total: `${(stats.leaves.byStatus?.approved || 0)} approved`, color: 'from-amber-500 to-orange-600' },
        ];

        // Task status pie data
        const taskStatusData = Object.entries(stats.tasks.byStatus || {}).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
            value
        }));

        return (
            <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {heroCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={i}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover={{ scale: 1.03, y: -4 }}
                                className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl bg-gradient-to-br ${card.color} cursor-pointer`}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-sm font-medium mb-1">{card.label}</p>
                                    <p className="text-3xl font-bold mb-1">{card.value}</p>
                                    <p className="text-white/60 text-xs">{card.total}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Task Status Donut */}
                    <motion.div variants={itemVariants} className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Task Status</h3>
                        {taskStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={taskStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {taskStatusData.map((_, idx) => (
                                            <Cell key={idx} fill={TASK_STATUS_COLORS[idx % TASK_STATUS_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400">
                                <p>No tasks yet</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-xl text-white">
                        <div className="flex items-center gap-3 mb-6">
                            <Activity className="w-5 h-5 text-blue-400" />
                            <h3 className="text-xl font-bold">Recent Activity</h3>
                        </div>
                        <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                            {stats.recentActivity && stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((log, i) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-start gap-3 pb-4 border-b border-white/10 last:border-0"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/90 font-medium truncate">
                                                {log.userName && <span className="text-blue-300">{log.userName}</span>}
                                                {' '}{log.action}
                                            </p>
                                            {log.details && (
                                                <p className="text-xs text-white/50 truncate mt-0.5">{log.details}</p>
                                            )}
                                            <p className="text-xs text-white/40 mt-1">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                                            </p>
                                        </div>
                                        {log.entityType && (
                                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-white/60 flex-shrink-0">
                                                {log.entityType}
                                            </span>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-32 text-white/40">
                                    <p>No recent activity</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        );
    };

    // ─── Analytics Tab ───────────────────────────────────────────
    const AnalyticsTab = () => {
        if (!stats || !stats.projects || !stats.tasks || !stats.attendance || !stats.leaves) return null;

        // Weekly productivity data
        const productivityData = stats.productivity || [];

        // Priority bar data
        const priorityData = Object.entries(stats.tasks.byPriority || {}).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            count: value,
            fill: PRIORITY_COLORS[name] || '#6366f1'
        }));

        // Project status pie data
        const projectStatusData = Object.entries(stats.projects.byStatus || {}).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
            value,
            fill: PROJECT_STATUS_COLORS[name] || '#6366f1'
        }));

        return (
            <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
                {/* Weekly Productivity */}
                <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">Weekly Productivity</h3>
                            <p className="text-sm text-gray-500 mt-1">Tasks completed per week (last 8 weeks)</p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={productivityData}>
                            <defs>
                                <linearGradient id="productivityGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="count"
                                name="Tasks Completed"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fill="url(#productivityGrad)"
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                                activeDot={{ r: 7, fill: '#4f46e5' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Priority */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Task Priority Distribution</h3>
                        {priorityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={priorityData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Tasks" radius={[8, 8, 0, 0]}>
                                        {priorityData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400"><p>No task data</p></div>
                        )}
                    </motion.div>

                    {/* Project Status */}
                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-8 shadow-xl text-white">
                        <h3 className="text-xl font-bold mb-6">Project Status</h3>
                        {projectStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={projectStatusData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {projectStatusData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-white/40"><p>No projects</p></div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        );
    };

    // ─── Attendance Tab ──────────────────────────────────────────
    const AttendanceTab = () => {
        if (!stats || !stats.projects || !stats.tasks || !stats.attendance || !stats.leaves) return null;

        const { presentCount, lateCount, totalDays, workingDays, rate, avgCheckInTime } = stats.attendance;
        const absentCount = Math.max(0, workingDays - (presentCount + lateCount));

        const radialData = [
            { name: 'Present', value: presentCount, fill: '#10b981' },
            { name: 'Late', value: lateCount, fill: '#f59e0b' },
            { name: 'Absent', value: absentCount, fill: '#ef4444' },
        ];

        const summaryCards = [
            { label: 'Attendance Rate', value: `${rate}%`, icon: '📊', color: rate >= 80 ? 'border-l-green-500' : rate >= 50 ? 'border-l-yellow-500' : 'border-l-red-500' },
            { label: 'Avg Check-in', value: avgCheckInTime, icon: '⏰', color: 'border-l-blue-500' },
            { label: 'Days Present', value: presentCount, icon: '✅', color: 'border-l-emerald-500' },
            { label: 'Days Late', value: lateCount, icon: '⚡', color: 'border-l-amber-500' },
        ];

        return (
            <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {summaryCards.map((card, i) => (
                        <motion.div
                            key={i}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className={`bg-white rounded-2xl p-6 shadow-xl border-l-4 ${card.color}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">{card.label}</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                                </div>
                                <span className="text-3xl">{card.icon}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Radial Chart */}
                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 shadow-xl text-white">
                        <h3 className="text-xl font-bold mb-2">Monthly Breakdown</h3>
                        <p className="text-white/70 text-sm mb-4">This month's attendance distribution</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="30%"
                                outerRadius="100%"
                                data={radialData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    background={{ fill: 'rgba(255,255,255,0.1)' }}
                                    dataKey="value"
                                    cornerRadius={10}
                                />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    verticalAlign="bottom"
                                    formatter={(value) => <span className="text-xs text-white/80">{value}</span>}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', color: '#1e293b' }}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </motion.div>

                    {/* Attendance Overview */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Attendance Overview</h3>
                        <div className="space-y-5">
                            {[
                                { label: 'Present Days', value: presentCount, max: workingDays, color: 'bg-emerald-500' },
                                { label: 'Late Days', value: lateCount, max: workingDays, color: 'bg-amber-500' },
                                { label: 'Absent Days', value: absentCount, max: workingDays, color: 'bg-red-500' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                                        <span className="text-sm font-bold text-gray-800">{item.value} / {item.max}</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`${item.color} h-full rounded-full`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.2, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                <p className="text-sm font-semibold text-gray-700">Working Days This Month</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{workingDays} <span className="text-sm font-normal text-gray-500">days</span></p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        );
    };

    // ─── Leave Stats Tab ─────────────────────────────────────────
    const LeaveStatsTab = () => {
        if (!stats || !stats.projects || !stats.tasks || !stats.attendance || !stats.leaves) return null;

        const leaveStatusData = Object.entries(stats.leaves.byStatus || {}).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            fill: LEAVE_STATUS_COLORS[name] || '#6366f1'
        }));

        const leaveTypeData = Object.entries(stats.leaves.byType || {}).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            count: value
        }));

        const totalLeaves = leaveStatusData.reduce((sum, d) => sum + d.value, 0);

        const leaveCards = [
            { label: 'Total Requests', value: totalLeaves, icon: '📋', gradient: 'from-blue-500 to-indigo-600' },
            { label: 'Approved', value: stats.leaves.byStatus?.approved || 0, icon: '✅', gradient: 'from-emerald-500 to-teal-600' },
            { label: 'Pending', value: stats.leaves.pending, icon: '⏳', gradient: 'from-amber-500 to-orange-600' },
            { label: 'Rejected', value: stats.leaves.byStatus?.rejected || 0, icon: '❌', gradient: 'from-red-500 to-rose-600' },
        ];

        return (
            <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
                {/* Leave Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {leaveCards.map((card, i) => (
                        <motion.div
                            key={i}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            whileHover={{ scale: 1.03, y: -4 }}
                            className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl bg-gradient-to-br ${card.gradient} cursor-pointer`}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                            <span className="text-3xl mb-3 block">{card.icon}</span>
                            <p className="text-white/80 text-sm font-medium">{card.label}</p>
                            <p className="text-3xl font-bold mt-1">{card.value}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leave Status Pie */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Leave Status Breakdown</h3>
                        {leaveStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={leaveStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {leaveStatusData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-72 flex items-center justify-center text-gray-400"><p>No leave data</p></div>
                        )}
                    </motion.div>

                    {/* Leave by Type */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Leave by Type</h3>
                        {leaveTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={leaveTypeData} layout="vertical" barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={80}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Requests" radius={[0, 8, 8, 0]}>
                                        {leaveTypeData.map((_, idx) => (
                                            <Cell key={idx} fill={LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-72 flex items-center justify-center text-gray-400"><p>No leave type data</p></div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        );
    };

    // ─── Tab Definitions ─────────────────────────────────────────
    const pages = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'attendance', label: 'Attendance', icon: '🕐' },
        { id: 'leaves', label: 'Leave Stats', icon: '🏖️' },
    ];

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
                        Dashboard
                    </h1>
                    <p className="text-gray-600">Welcome back! Here's your workspace overview.</p>
                </motion.div>

                {/* Navigation Tabs */}
                <motion.div
                    className="flex gap-4 mb-8 overflow-x-auto pb-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                >
                    {pages.map((page) => (
                        <button
                            key={page.id}
                            onClick={() => setActiveTab(page.id)}
                            className={`px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${
                                activeTab === page.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                            }`}
                        >
                            <span className="mr-2">{page.icon}</span>
                            {page.label}
                        </button>
                    ))}
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading dashboard data...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                        <p className="text-red-500 font-medium">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div>
                        {activeTab === 'overview' && <OverviewTab />}
                        {activeTab === 'analytics' && <AnalyticsTab />}
                        {activeTab === 'attendance' && <AttendanceTab />}
                        {activeTab === 'leaves' && <LeaveStatsTab />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;