import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
    Activity, ShieldAlert, Users, Award, TrendingUp, AlertTriangle, 
    Plus, Trash2, CheckCircle2, ChevronRight, Loader2, ArrowLeft,
    Clock, Flame, Brain, Sparkles, Send, Calendar, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjectDetails } from '../Services/projectApi';
import { 
    getProjectHealth, getWorkloadBalancer, getBurnoutRisk, 
    getProjectDependencies, addDependency, deleteDependency, runEscalationCheck 
} from '../Services/intelligenceApi';

export default function ProjectIntelligenceDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const workspaceId = user?.activeWorkspaceId;

    const [project, setProject] = useState(null);
    const [health, setHealth] = useState(null);
    const [workload, setWorkload] = useState(null);
    const [burnout, setBurnout] = useState(null);
    const [dependenciesData, setDependenciesData] = useState({ dependencies: [], risks: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('health');

    // Add dependency form
    const [depTaskId, setDepTaskId] = useState('');
    const [depParentId, setDepParentId] = useState('');
    const [depType, setDepType] = useState('FS');
    const [addingDep, setAddingDep] = useState(false);

    // Escalation testing loader
    const [runningEscalation, setRunningEscalation] = useState(false);

    // Manual refresh metrics loader
    const [refreshingMetrics, setRefreshingMetrics] = useState(false);

    // Per-row dependency deletion loader
    const [deletingDepId, setDeletingDepId] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const projDetails = await getProjectDetails(id);
            setProject(projDetails);

            const healthData = await getProjectHealth(id);
            setHealth(healthData);

            const workloadData = await getWorkloadBalancer(id);
            setWorkload(workloadData);

            if (workspaceId) {
                const burnoutData = await getBurnoutRisk(workspaceId);
                setBurnout(burnoutData);
            }

            const depsData = await getProjectDependencies(id);
            setDependenciesData(depsData);

        } catch (error) {
            console.error('Failed to load project intelligence data:', error);
            toast.error('Failed to load project intelligence dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, workspaceId]);

    const handleAddDependency = async (e) => {
        e.preventDefault();
        if (!depTaskId || !depParentId) {
            toast.error('Please select both tasks');
            return;
        }
        if (depTaskId === depParentId) {
            toast.error('A task cannot depend on itself');
            return;
        }

        try {
            setAddingDep(true);
            await addDependency(Number(depTaskId), Number(depParentId), depType);
            toast.success('Dependency added successfully');
            setDepTaskId('');
            setDepParentId('');
            
            // Reload dependencies & risks
            const depsData = await getProjectDependencies(id);
            setDependenciesData(depsData);

            // Reload health overview since dependencies changed health
            const healthData = await getProjectHealth(id);
            setHealth(healthData);
        } catch (error) {
            console.error('Failed to add dependency:', error);
            toast.error(error.response?.data?.error || 'Failed to add dependency');
        } finally {
            setAddingDep(false);
        }
    };

    const handleDeleteDependency = async (depId) => {
        try {
            setDeletingDepId(depId);
            await deleteDependency(depId);
            toast.success('Dependency deleted');

            // Reload dependencies & risks
            const depsData = await getProjectDependencies(id);
            setDependenciesData(depsData);

            // Reload health overview
            const healthData = await getProjectHealth(id);
            setHealth(healthData);
        } catch (error) {
            console.error('Failed to delete dependency:', error);
            toast.error('Failed to delete dependency');
        } finally {
            setDeletingDepId(null);
        }
    };

    const handleRefreshMetrics = async () => {
        try {
            setRefreshingMetrics(true);
            await loadData();
            toast.success('Metrics refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh metrics:', error);
            toast.error('Failed to refresh metrics');
        } finally {
            setRefreshingMetrics(false);
        }
    };

    const handleRunEscalationCheck = async () => {
        try {
            setRunningEscalation(true);
            const res = await runEscalationCheck();
            toast.success(res.message || 'Auto Escalation scan completed successfully!');
            // Reload page metrics since priority or status might have changed
            loadData();
        } catch (error) {
            console.error('Failed to run escalation:', error);
            toast.error('Failed to run escalation check');
        } finally {
            setRunningEscalation(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-card text-ink">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-ink-soft font-semibold">Analyzing Project Intelligence Metrics...</p>
            </div>
        );
    }

    // Pie chart mapping
    const pieData = health ? [
        { name: 'Healthy (Green)', value: health.taskHealthDistribution.Green || 0, color: '#10b981' },
        { name: 'Warning (Yellow)', value: health.taskHealthDistribution.Yellow || 0, color: '#f59e0b' },
        { name: 'Critical (Red)', value: health.taskHealthDistribution.Red || 0, color: '#ef4444' }
    ].filter(d => d.value > 0) : [];

    // If all are 0, default pie
    if (pieData.length === 0) {
        pieData.push({ name: 'No tasks', value: 1, color: '#4b5563' });
    }

    return (
        <div className="min-h-screen text-ink py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card backdrop-blur-md p-6 rounded-3xl border border-line">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(`/projects/${id}`)}
                            className="p-3 bg-surface-2 hover:bg-gray-700/80 rounded-2xl transition border border-line text-ink-soft hover:text-ink"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-blue-500">Enterprise intelligence portal</span>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-ink">
                                {project?.name} - Analytics
                            </h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRunEscalationCheck}
                            disabled={runningEscalation}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-lg border border-red-500/20 disabled:opacity-50 transition cursor-pointer text-sm"
                        >
                            {runningEscalation ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Clock className="h-4 w-4" />
                            )}
                            Scan Overdue Escalations
                        </button>
                        
                        <button
                            onClick={handleRefreshMetrics}
                            disabled={refreshingMetrics}
                            className="flex items-center gap-2 px-5 py-3 bg-surface-2 hover:bg-gray-700 text-ink font-semibold rounded-2xl border border-line transition text-sm cursor-pointer disabled:opacity-50"
                        >
                            {refreshingMetrics ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Refreshing...
                                </>
                            ) : (
                                'Refresh Metrics'
                            )}
                        </button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* circular health score */}
                    <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line flex items-center justify-between">
                        <div>
                            <span className="text-ink-soft text-xs font-semibold uppercase">Project Health Score</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className={`text-4xl font-extrabold ${
                                    (100 - (health?.riskScore || 0)) >= 80 ? 'text-green-500' :
                                    (100 - (health?.riskScore || 0)) >= 50 ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                    {health ? 100 - health.riskScore : 'N/A'}
                                </span>
                                <span className="text-ink-soft text-sm">/ 100</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
                            <Activity className="h-6 w-6" />
                        </div>
                    </div>

                    {/* risk score */}
                    <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line flex items-center justify-between">
                        <div>
                            <span className="text-ink-soft text-xs font-semibold uppercase">Workspace Risk Index</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className={`text-4xl font-extrabold ${
                                    (health?.riskScore || 0) < 30 ? 'text-green-400' :
                                    (health?.riskScore || 0) < 60 ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                    {health?.riskScore || 0}
                                </span>
                                <span className="text-ink-soft text-sm">/ 100</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-red-500/10 text-red-400">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                    </div>

                    {/* Sprint Velocity */}
                    <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line flex items-center justify-between">
                        <div>
                            <span className="text-ink-soft text-xs font-semibold uppercase">Sprint Velocity</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-4xl font-extrabold text-ink">
                                    {health?.sprintVelocity || 0}
                                </span>
                                <span className="text-ink-soft text-sm">pts completed</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-500">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                    </div>

                    {/* Team Productivity */}
                    <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line flex items-center justify-between">
                        <div>
                            <span className="text-ink-soft text-xs font-semibold uppercase">Productivity (30d)</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-4xl font-extrabold text-ink">
                                    {health?.teamProductivity || 0}
                                </span>
                                <span className="text-ink-soft text-sm">tasks closed</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Award className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-line">
                    {[
                        { id: 'health', label: 'Project Health', icon: Activity },
                        { id: 'workload', label: 'Workload Balancer', icon: Users },
                        { id: 'burnout', label: 'Burnout Risk Scanner', icon: Flame },
                        { id: 'dependencies', label: 'Dependency Engine', icon: ShieldAlert }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition cursor-pointer ${
                                activeTab === tab.id 
                                ? 'border-blue-500 text-blue-500' 
                                : 'border-transparent text-ink-soft hover:text-ink hover:border-line'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tabs Panels */}
                <div className="space-y-8">
                    
                    {/* Tab 1: Project Health */}
                    {activeTab === 'health' && health && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Health Distribution Chart */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-1">
                                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-500" />
                                    Task Health Distribution
                                </h3>
                                
                                <div className="h-64 flex justify-center items-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-line">
                                        <div className="flex items-center gap-2">
                                            <span className="h-3 w-3 rounded-full bg-card"></span>
                                            <span className="text-sm font-semibold text-ink">Healthy (Green)</span>
                                        </div>
                                        <span className="text-sm font-bold text-ink">{health.taskHealthDistribution.Green}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-line">
                                        <div className="flex items-center gap-2">
                                            <span className="h-3 w-3 rounded-full bg-card"></span>
                                            <span className="text-sm font-semibold text-ink">Warning (Yellow)</span>
                                        </div>
                                        <span className="text-sm font-bold text-ink">{health.taskHealthDistribution.Yellow}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-line">
                                        <div className="flex items-center gap-2">
                                            <span className="h-3 w-3 rounded-full bg-card"></span>
                                            <span className="text-sm font-semibold text-ink">Critical (Red)</span>
                                        </div>
                                        <span className="text-sm font-bold text-ink">{health.taskHealthDistribution.Red}</span>
                                    </div>
                                    <div className="mt-4 p-3 bg-blue-500/5 text-blue-400 text-xs rounded-xl border border-blue-500/10 font-semibold flex items-center gap-2">
                                        <Clock className="h-4 w-4 flex-shrink-0" />
                                        <span>Attendance Impact Correlation: {health.attendanceImpact}</span>
                                    </div>
                                </div>
                            </div>

                            {/* AI recommendations */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-2">
                                <div className="flex items-center justify-between border-b border-line pb-4">
                                    <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
                                        AI recommendations & Action Plans
                                    </h3>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold rounded-full">
                                        <Sparkles className="h-3 w-3" />
                                        Mistral AI active
                                    </span>
                                </div>
                                <div className="prose prose-invert max-w-none text-ink text-sm leading-relaxed whitespace-pre-wrap bg-surface-2 p-6 rounded-2xl border border-line font-medium">
                                    {health.aiRecommendations}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Workload Balancer */}
                    {activeTab === 'workload' && workload && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Capacity Heatmap Grid */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-2">
                                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-500" />
                                    Active Task Distribution & Capacities
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {workload.capacities.map(cap => {
                                        const heat = workload.heatmap.find(h => h.userId === cap.userId);
                                        return (
                                            <div 
                                                key={cap.userId} 
                                                className="bg-surface-2 p-5 rounded-2xl border border-line flex flex-col justify-between space-y-4"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-ink text-base">{cap.userName}</h4>
                                                        <span className="text-ink-soft text-xs font-semibold">Resource</span>
                                                    </div>
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                                                        cap.status === 'Underloaded' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        cap.status === 'Optimal' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                        {cap.status}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-semibold text-ink-soft">
                                                        <span>Active tasks</span>
                                                        <span>{heat?.activeTasksCount || 0} tasks</span>
                                                    </div>
                                                    <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${
                                                                cap.status === 'Underloaded' ? 'bg-green-500' :
                                                                cap.status === 'Optimal' ? 'bg-blue-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, ((heat?.activeTasksCount || 0) / 8) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-semibold text-ink-soft">
                                                        <span>Capacity remaining</span>
                                                        <span>{cap.capacityHours} hrs/week</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Resource balancing AI suggestions */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-1">
                                <div className="border-b border-line pb-4 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-amber-500" />
                                        Resource Balancer AI
                                    </h3>
                                    <span className="text-[10px] text-ink-soft font-bold uppercase tracking-wider bg-surface-2 border border-line px-2 py-0.5 rounded">Mistral Suggested</span>
                                </div>
                                <div className="prose prose-invert max-w-none text-ink text-xs leading-relaxed whitespace-pre-wrap bg-surface-2 p-4 rounded-xl border border-line font-medium">
                                    {workload.aiSuggestions}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Burnout Risk Scanner */}
                    {activeTab === 'burnout' && burnout && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Burnout Table */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-2">
                                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-red-500" />
                                    Workspace Burnout Scores
                                </h3>

                                <div className="space-y-4">
                                    {burnout.burnoutScores.map(userScore => (
                                        <div 
                                            key={userScore.userId}
                                            className="bg-surface-2 p-5 rounded-2xl border border-line flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                                        >
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-ink text-base">{userScore.userName}</h4>
                                                    <span className={`px-2 py-0.5 text-xxs font-bold rounded-full ${
                                                        userScore.riskLevel === 'Low' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        userScore.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                                                    }`}>
                                                        {userScore.riskLevel} Risk
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 text-xs font-semibold text-ink-soft">
                                                    <span>Overtime days: <strong className="text-ink">{userScore.metrics.overtimeDays}</strong></span>
                                                    <span>Active Tasks: <strong className="text-ink">{userScore.metrics.activeTasks}</strong></span>
                                                    <span>Overdue: <strong className="text-ink">{userScore.metrics.overdueTasks}</strong></span>
                                                    <span>Attendance: <strong className="text-ink">{userScore.metrics.attendanceRate}%</strong></span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold text-ink-soft">Burnout Index</span>
                                                    <p className={`text-2xl font-black ${
                                                        userScore.burnoutScore >= 70 ? 'text-red-500' :
                                                        userScore.burnoutScore >= 40 ? 'text-amber-500' : 'text-green-500'
                                                    }`}>
                                                        {userScore.burnoutScore}
                                                    </p>
                                                </div>
                                                <div className="w-20 bg-surface-2 h-1.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${
                                                            userScore.burnoutScore >= 70 ? 'bg-red-500' :
                                                            userScore.burnoutScore >= 40 ? 'bg-amber-500' : 'bg-green-500'
                                                        }`}
                                                        style={{ width: `${userScore.burnoutScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preventative Recommendations */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-1">
                                <div className="border-b border-line pb-4">
                                    <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-purple-400" />
                                        Mitigation Guidelines
                                    </h3>
                                </div>
                                <div className="prose prose-invert max-w-none text-ink text-xs leading-relaxed whitespace-pre-wrap bg-surface-2 p-4 rounded-xl border border-line font-medium">
                                    {burnout.aiRecommendations}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Dependency Engine */}
                    {activeTab === 'dependencies' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Left panel: Add Dependency & Dependency List */}
                            <div className="space-y-6 lg:col-span-2">
                                
                                {/* Add Dependency Card */}
                                <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-4">
                                    <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                        <Plus className="h-5 w-5 text-blue-500" />
                                        Establish Task Dependency
                                    </h3>
                                    
                                    <form onSubmit={handleAddDependency} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                                            <label className="text-xs font-semibold text-ink-soft">Target Task</label>
                                            <select
                                                value={depTaskId}
                                                onChange={(e) => setDepTaskId(e.target.value)}
                                                className="bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Select Task</option>
                                                {project?.tasks?.map(t => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                                            <label className="text-xs font-semibold text-ink-soft">Dependency Type</label>
                                            <select
                                                value={depType}
                                                onChange={(e) => setDepType(e.target.value)}
                                                className="bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="FS">Finish-to-Start (FS)</option>
                                                <option value="SS">Start-to-Start (SS)</option>
                                                <option value="FF">Finish-to-Finish (FF)</option>
                                                <option value="SF">Start-to-Finish (SF)</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                                            <label className="text-xs font-semibold text-ink-soft">Depends On Predecessor</label>
                                            <select
                                                value={depParentId}
                                                onChange={(e) => setDepParentId(e.target.value)}
                                                className="bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Select Predecessor</option>
                                                {project?.tasks?.map(t => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-end justify-end sm:col-span-1">
                                            <button
                                                type="submit"
                                                disabled={addingDep}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow border border-blue-500/20 disabled:opacity-50 transition cursor-pointer text-sm"
                                            >
                                                {addingDep ? 'Linking...' : 'Link Tasks'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Active Dependencies List */}
                                <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-4">
                                    <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                        <CheckSquare className="h-5 w-5 text-violet-500" />
                                        Task Dependencies Ledger
                                    </h3>

                                    {dependenciesData.dependencies.length === 0 ? (
                                        <p className="text-ink-soft text-sm text-center py-6">No task dependency mappings defined.</p>
                                    ) : (
                                        <div className="divide-y divide-gray-800">
                                            {dependenciesData.dependencies.map(dep => {
                                                const task = project?.tasks?.find(t => t.id === dep.taskId);
                                                const parent = project?.tasks?.find(t => t.id === dep.dependsOnTaskId);
                                                return (
                                                    <div key={dep.id} className="flex justify-between items-center py-4 gap-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Link to={`/tasks/${dep.taskId}`} className="text-sm font-bold text-blue-400 hover:underline">
                                                                {task?.title || `Task #${dep.taskId}`}
                                                            </Link>
                                                            <span className="px-2 py-0.5 bg-surface-2 border border-line text-[10px] font-black rounded text-ink-soft">
                                                                {dep.dependencyType}
                                                            </span>
                                                            <ChevronRight className="h-3 w-3 text-ink-soft" />
                                                            <span className="text-xs text-ink-soft font-medium">Predecessor:</span>
                                                            <Link to={`/tasks/${dep.dependsOnTaskId}`} className="text-sm font-bold text-ink hover:underline">
                                                                {parent?.title || `Task #${dep.dependsOnTaskId}`}
                                                            </Link>
                                                        </div>

                                                        <button
                                                            onClick={() => handleDeleteDependency(dep.id)}
                                                            disabled={deletingDepId === dep.id}
                                                            className="p-2 hover:bg-red-500/10 text-white0 hover:text-red-500 rounded-xl transition cursor-pointer disabled:opacity-50"
                                                        >
                                                            {deletingDepId === dep.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right panel: Alerts & Violations */}
                            <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-line space-y-6 lg:col-span-1">
                                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Dynamic Constraint Violations
                                </h3>

                                {dependenciesData.risks.length === 0 ? (
                                    <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-2xl text-center space-y-2">
                                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                                        <p className="text-green-400 font-bold text-sm">Clear</p>
                                        <p className="text-ink-soft text-xs">All dependencies comply with logical rules.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {dependenciesData.risks.map((risk, index) => (
                                            <div 
                                                key={index} 
                                                className={`p-4 border rounded-2xl flex items-start gap-3 ${
                                                    risk.severity === 'high' 
                                                    ? 'bg-red-500/5 border-red-500/10 text-red-400' 
                                                    : 'bg-amber-500/5 border-amber-500/10 text-amber-400'
                                                }`}
                                            >
                                                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                                        {risk.severity} severity
                                                    </span>
                                                    <p className="text-xs font-semibold leading-relaxed text-ink">
                                                        {risk.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
