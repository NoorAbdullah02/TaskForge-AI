import React, { useState, useEffect } from 'react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { 
    TrendingUp, AlertTriangle, Users, CheckCircle2, Clock, 
    ShieldAlert, Sparkles, RefreshCw, Briefcase, Zap,
    Calendar, Flame, Loader2
} from 'lucide-react';
import { getExecutiveStats, predictProjectSuccess, getResourcePlanner } from '../Services/aiApi';
import { getProjects } from '../Services/projectApi';
import toast from 'react-hot-toast';

const ExecutiveDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [projectsList, setProjectsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectSuccessData, setProjectSuccessData] = useState(null);
    const [resourceData, setResourceData] = useState(null);
    const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboardData = async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const data = await getExecutiveStats();
            setStats(data);
            const projs = await getProjects();
            setProjectsList(projs || []);
            if (projs && projs.length > 0) {
                setSelectedProject(projs[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch executive stats:', err);
            toast.error('Failed to load dashboard metrics');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchDashboardData({ silent: true });
            toast.success('Dashboard intelligence refreshed');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to refresh dashboard intelligence');
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            loadProjectDetails(selectedProject);
        }
    }, [selectedProject]);

    const loadProjectDetails = async (projectId) => {
        setLoadingProjectDetails(true);
        try {
            const successPredict = await predictProjectSuccess(projectId);
            setProjectSuccessData(successPredict);
            const resourcePlan = await getResourcePlanner(projectId);
            setResourceData(resourcePlan);
        } catch (err) {
            console.error('Failed to load project intelligence metrics:', err);
        } finally {
            setLoadingProjectDetails(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-ink bg-surface">
                <div className="relative flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 border-opacity-50"></div>
                    <Sparkles className="w-6 h-6 text-indigo-400 absolute top-5 animate-pulse" />
                    <span className="mt-4 text-xs font-black tracking-widest text-ink-soft uppercase">Analyzing Platform Operations...</span>
                </div>
            </div>
        );
    }

    // Mock trend history for executive area charts
    const forecastHistory = [
        { name: 'Week 1', CompletedTasks: Math.round((stats?.projectHealth || 80) * 0.7), RisksDetected: stats?.forecasts?.risksDetected + 2 },
        { name: 'Week 2', CompletedTasks: Math.round((stats?.projectHealth || 80) * 0.8), RisksDetected: stats?.forecasts?.risksDetected + 1 },
        { name: 'Week 3', CompletedTasks: Math.round((stats?.projectHealth || 80) * 0.9), RisksDetected: stats?.forecasts?.risksDetected },
        { name: 'Week 4 (Forecast)', CompletedTasks: stats?.projectHealth || 85, RisksDetected: Math.max(0, stats?.forecasts?.risksDetected - 1) },
    ];

    const getRiskColor = (score) => {
        if (score < 30) return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
        if (score < 70) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
        return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
    };

    const getRiskBg = (level) => {
        if (level === 'low') return 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-700';
        if (level === 'medium') return 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-700';
        return 'from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-700';
    };

    return (
        <div className="min-h-screen text-ink p-6 lg:p-10 bg-surface">
            {/* Header section */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">AI Platform Executive Center</span>
                    </div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        Enterprise Project Intelligence
                    </h1>
                    <p className="text-xs text-ink-soft font-medium">Real-time workspace success forecasting, team allocation modeling, and risk optimization.</p>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 hover:bg-surface-3 border border-line rounded-xl text-xs font-black text-ink transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                    {isRefreshing ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                            Refresh Intelligence
                        </>
                    )}
                </button>
            </div>

            {/* Top metrics grids */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Project Health Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-card border border-line rounded-3xl p-6 relative overflow-hidden shadow-soft"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <Briefcase className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Optimum
                        </span>
                    </div>
                    <h2 className="text-xs font-black tracking-wider text-ink-soft uppercase mb-1">Project Health Score</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-ink">{stats?.projectHealth || 100}%</span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-3 font-medium">Completion rate of active roadmap goals across all projects.</p>
                </motion.div>

                {/* Team Productivity Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="bg-card border border-line rounded-3xl p-6 relative overflow-hidden shadow-soft"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <Users className="w-5 h-5 text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> High Velocity
                        </span>
                    </div>
                    <h2 className="text-xs font-black tracking-wider text-ink-soft uppercase mb-1">Team Productivity Score</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-ink">{stats?.teamProductivity || 80}/100</span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-3 font-medium">Average performance score computed from task delivery velocity.</p>
                </motion.div>

                {/* AI Risk Score Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="bg-card border border-line rounded-3xl p-6 relative overflow-hidden shadow-soft"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <ShieldAlert className="w-5 h-5 text-rose-500" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getRiskColor(stats?.aiRiskScore || 0)}`}>
                            <AlertTriangle className="w-3 h-3" /> {stats?.aiRiskScore > 50 ? 'Action Required' : 'Minimal'}
                        </span>
                    </div>
                    <h2 className="text-xs font-black tracking-wider text-ink-soft uppercase mb-1">Aggregate Risk Score</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-ink">{stats?.aiRiskScore || 0}%</span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-3 font-medium">Workspace vulnerability rating calculated from overdue and critical tasks.</p>
                </motion.div>
            </div>

            {/* Visual Charts section */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Forecast area chart */}
                <div className="lg:col-span-2 bg-card border border-line rounded-3xl p-6 shadow-soft">
                    <h2 className="text-sm font-black text-ink tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        ROADMAP DELIVERY & BLOCKER MITIGATION FORECAST
                    </h2>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecastHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorRisks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="var(--color-ink-soft)" style={{ fontSize: 10, fontWeight: 700 }} />
                                <YAxis stroke="var(--color-ink-soft)" style={{ fontSize: 10, fontWeight: 700 }} />
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-line)', color: 'var(--color-ink)', borderRadius: 12 }} />
                                <Area type="monotone" dataKey="CompletedTasks" stroke="#6366f1" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} name="Completed Goals Ratio" />
                                <Area type="monotone" dataKey="RisksDetected" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRisks)" strokeWidth={2} name="Blocker Overdues" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Forecast Summary box */}
                <div className="bg-card border border-line rounded-3xl p-6 flex flex-col justify-between shadow-soft">
                    <div>
                        <h2 className="text-sm font-black text-ink tracking-wider mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
                            AI MILESTONE FORECASTS
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-line pb-3">
                                <div>
                                    <span className="text-[10px] font-black text-ink-soft uppercase">Predicted Delay Period</span>
                                    <p className="text-ink font-extrabold text-sm">{stats?.forecasts?.delayDays || 0} Working Days</p>
                                </div>
                                <span className={`text-[10px] font-extrabold px-2 py-1 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20`}>
                                    Delay Warning
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-line pb-3">
                                <div>
                                    <span className="text-[10px] font-black text-ink-soft uppercase">Workspace Completion Rate</span>
                                    <p className="text-ink font-extrabold text-sm">{stats?.forecasts?.completionRate || 100}%</p>
                                </div>
                                <span className="text-[10px] font-extrabold px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                    Target Velocity
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-ink-soft uppercase">Mitigations Scheduled</span>
                                    <p className="text-ink font-extrabold text-sm">{stats?.forecasts?.risksDetected || 0} Auto Rules Active</p>
                                </div>
                                <span className="text-[10px] font-extrabold px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Protected
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl mt-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">AI Optimizer recommendation</span>
                        </div>
                        <p className="text-[11px] text-ink-soft leading-relaxed font-medium">
                            {stats?.aiRiskScore > 35 
                                ? 'Task bottlenecks detected in recent sprint logs. Recommend re-allocating tasks using the AI Resource Planner.' 
                                : 'Timeline risk is low. Productivity levels indicate high team capacity for new epics.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Individual Project Success Predictor and Resource Allocation Section */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left controls and Project List selector */}
                <div className="bg-card border border-line rounded-3xl p-6 flex flex-col shadow-soft">
                    <h2 className="text-sm font-black text-ink tracking-wider mb-1 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-500" />
                        PROJECT SELECTOR
                    </h2>
                    <p className="text-[11px] text-ink-soft font-medium mb-4">Select a project to simulate deadline success and optimal resource mapping.</p>

                    <div className="space-y-2 overflow-y-auto max-h-[300px] flex-1 pr-1">
                        {projectsList.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProject(p.id)}
                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition cursor-pointer ${
                                    selectedProject === p.id 
                                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 font-extrabold'
                                        : 'bg-surface-2 border-line text-ink-soft hover:bg-surface-2/60'
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-black truncate max-w-[150px]">{p.name}</p>
                                    <span className="text-[9px] text-ink-faint capitalize">{p.status}</span>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}>
                                    {p.status}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Project Success & Deadline Predictor details */}
                <div className="bg-card border border-line rounded-3xl p-6 lg:col-span-2 relative shadow-soft">
                    <h2 className="text-sm font-black text-ink tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                        PROJECT INTELLIGENCE FORECAST MODEL
                    </h2>

                    {loadingProjectDetails ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface-2/50 backdrop-blur-sm rounded-3xl z-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500"></div>
                        </div>
                    ) : null}

                    {projectSuccessData ? (
                        <div className="space-y-6">
                            {/* Success prediction row stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-4 rounded-2xl border bg-gradient-to-br ${getRiskBg(projectSuccessData.risk_level)}`}>
                                    <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">Predicted Success Chance</span>
                                    <p className="text-2xl font-black mt-1">{projectSuccessData.success_probability}%</p>
                                </div>

                                <div className="p-4 rounded-2xl border border-line bg-surface-2/40">
                                    <span className="text-[9px] font-black text-ink-soft uppercase tracking-wider block">Delay Probability</span>
                                    <p className="text-2xl font-black text-rose-600 mt-1">{projectSuccessData.delay_probability}%</p>
                                </div>

                                <div className="p-4 rounded-2xl border border-line bg-surface-2/40">
                                    <span className="text-[9px] font-black text-ink-soft uppercase tracking-wider block">Timeline Risk Rating</span>
                                    <p className="text-2xl font-black text-amber-655 mt-1 capitalize">{projectSuccessData.risk_level}</p>
                                </div>
                            </div>

                            {/* Resource mapper recommendation details */}
                            {resourceData && (
                                <div className="border-t border-line pt-6">
                                    <h3 className="text-xs font-black text-ink uppercase tracking-wider mb-3.5 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" />
                                        RECOMMENDED ROLE ALLOCATION
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Developer Card */}
                                        <div className="p-3.5 bg-surface-2/40 border border-line rounded-2xl">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Best Developer Candidate</span>
                                            {resourceData.bestDeveloper ? (
                                                <div>
                                                    <p className="text-xs font-extrabold text-ink">{resourceData.bestDeveloper.name}</p>
                                                    <span className="text-[9px] text-ink-soft font-bold">Match: {resourceData.bestDeveloper.suitability_score}%</span>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-ink-faint">No developer matches</p>
                                            )}
                                        </div>

                                        {/* Designer Card */}
                                        <div className="p-3.5 bg-surface-2/40 border border-line rounded-2xl">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Best Designer Candidate</span>
                                            {resourceData.bestDesigner ? (
                                                <div>
                                                    <p className="text-xs font-extrabold text-ink">{resourceData.bestDesigner.name}</p>
                                                    <span className="text-[9px] text-ink-soft font-bold">Match: {resourceData.bestDesigner.suitability_score}%</span>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-ink-faint">No designer matches</p>
                                            )}
                                        </div>

                                        {/* Tester Card */}
                                        <div className="p-3.5 bg-surface-2/40 border border-line rounded-2xl">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Best Tester Candidate</span>
                                            {resourceData.bestTester ? (
                                                <div>
                                                    <p className="text-xs font-extrabold text-ink">{resourceData.bestTester.name}</p>
                                                    <span className="text-[9px] text-ink-soft font-bold">Match: {resourceData.bestTester.suitability_score}%</span>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-ink-faint">No QA matches</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 p-4 bg-surface-2/40 rounded-2xl border border-line">
                                        <div className="flex justify-between items-center text-[10px] text-ink-soft mb-2">
                                            <span className="font-bold">Ideal Team Size: <strong className="text-indigo-600">{resourceData.recommendedTeamSize} members</strong></span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(resourceData.recommendedRoles).map(([role, count]) => (
                                                <span key={role} className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 rounded-full">
                                                    {role}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center border border-dashed border-line rounded-2xl">
                            <span className="text-xs text-ink-faint">No forecast data loadable for selected project.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
