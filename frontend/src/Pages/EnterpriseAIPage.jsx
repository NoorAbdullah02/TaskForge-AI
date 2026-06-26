import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Brain, Activity, Flame, Mail, FileText, 
    Send, Loader2, AlertCircle, ShieldAlert, CheckSquare, 
    TrendingUp, Users, Briefcase, ChevronRight, HelpCircle
} from 'lucide-react';
import { getProjects } from '../Services/projectApi';
import {
    askEnterpriseCopilot,
    detectBurnout,
    detectTeamBurnout,
    getHealthScore,
    emailAssist,
    getWeeklyReport,
    getDailyStandup,
    getRoleDashboard
} from '../Services/aiApi';
import toast from 'react-hot-toast';

const EnterpriseAIPage = () => {
    const { isLoggedIn, loading: authLoading, user } = useAuth();
    const navigate = useNavigate();
    const [projectsList, setProjectsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [activeTab, setActiveTab] = useState('copilot');
    const [roleDashboardData, setRoleDashboardData] = useState(null);
    const [loadingDashboard, setLoadingDashboard] = useState(false);

    // AI States
    const [copilotInput, setCopilotInput] = useState('');
    const [copilotHistory, setCopilotHistory] = useState([]);
    const [loadingCopilot, setLoadingCopilot] = useState(false);

    const [burnoutUserId, setBurnoutUserId] = useState('');
    const [burnoutResult, setBurnoutResult] = useState(null);
    const [loadingBurnout, setLoadingBurnout] = useState(false);

    const [teamBurnoutResult, setTeamBurnoutResult] = useState(null);
    const [loadingTeamBurnout, setLoadingTeamBurnout] = useState(false);

    const [healthScoreType, setHealthScoreType] = useState('project');
    const [healthScoreId, setHealthScoreId] = useState('');
    const [healthScoreResult, setHealthScoreResult] = useState(null);
    const [loadingHealth, setLoadingHealth] = useState(false);

    const [emailContext, setEmailContext] = useState('');
    const [emailTone, setEmailTone] = useState('Professional');
    const [emailResult, setEmailResult] = useState(null);
    const [loadingEmail, setLoadingEmail] = useState(false);

    const [weeklyReportResult, setWeeklyReportResult] = useState(null);
    const [loadingWeekly, setLoadingWeekly] = useState(false);

    const [standupResult, setStandupResult] = useState(null);
    const [loadingStandup, setLoadingStandup] = useState(false);

    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchProjects();
            fetchRoleDashboard();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [copilotHistory]);

    const fetchProjects = async () => {
        try {
            const data = await getProjects();
            setProjectsList(data || []);
            if (data && data.length > 0) {
                setSelectedProject(data[0].id);
                setHealthScoreId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to load projects", error);
        }
    };

    const fetchRoleDashboard = async () => {
        setLoadingDashboard(true);
        try {
            const data = await getRoleDashboard();
            setRoleDashboardData(data);
        } catch (error) {
            console.error("Failed to fetch role dashboard insights", error);
        } finally {
            setLoadingDashboard(false);
        }
    };

    const handleSendCopilot = async (e) => {
        e.preventDefault();
        if (!copilotInput.trim()) return;

        const userMsg = { role: 'user', content: copilotInput };
        setCopilotHistory(prev => [...prev, userMsg]);
        setCopilotInput('');
        setLoadingCopilot(true);

        try {
            const data = await askEnterpriseCopilot(copilotInput, copilotHistory);
            setCopilotHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (error) {
            toast.error("Copilot request failed");
            setCopilotHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setLoadingCopilot(false);
        }
    };

    const handleDetectBurnout = async () => {
        setLoadingBurnout(true);
        setBurnoutResult(null);
        try {
            const data = await detectBurnout(burnoutUserId ? parseInt(burnoutUserId) : null);
            setBurnoutResult(data);
            toast.success("Burnout analysis completed!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Burnout analysis failed");
        } finally {
            setLoadingBurnout(false);
        }
    };

    const handleDetectTeamBurnout = async () => {
        if (!selectedProject) return;
        setLoadingTeamBurnout(true);
        setTeamBurnoutResult(null);
        try {
            const data = await detectTeamBurnout(selectedProject);
            setTeamBurnoutResult(data.teamBurnout);
            toast.success("Team burnout assessment finished!");
        } catch (error) {
            toast.error("Failed to assess team burnout");
        } finally {
            setLoadingTeamBurnout(false);
        }
    };

    const handleGetHealthScore = async () => {
        if (!healthScoreId) return;
        setLoadingHealth(true);
        setHealthScoreResult(null);
        try {
            const data = await getHealthScore(healthScoreType, healthScoreId);
            setHealthScoreResult(data);
            toast.success("Health score analyzed!");
        } catch (error) {
            toast.error("Health analysis failed");
        } finally {
            setLoadingHealth(false);
        }
    };

    const handleEmailAssist = async () => {
        if (!emailContext.trim()) return;
        setLoadingEmail(true);
        setEmailResult(null);
        try {
            const data = await emailAssist(emailContext, emailTone);
            setEmailResult(data);
            toast.success("Email drafted!");
        } catch (error) {
            toast.error("Failed to generate email");
        } finally {
            setLoadingEmail(false);
        }
    };

    const handleGetWeeklyReport = async () => {
        setLoadingWeekly(true);
        setWeeklyReportResult(null);
        try {
            const data = await getWeeklyReport();
            setWeeklyReportResult(data);
            toast.success("Weekly report generated!");
        } catch (error) {
            toast.error("Failed to generate report");
        } finally {
            setLoadingWeekly(false);
        }
    };

    const handleGetDailyStandup = async () => {
        setLoadingStandup(true);
        setStandupResult(null);
        try {
            const data = await getDailyStandup(true);
            setStandupResult(data);
            toast.success("Standup generated!");
        } catch (error) {
            toast.error("Failed to generate daily standup");
        } finally {
            setLoadingStandup(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
            </div>
        );
    }

    const isPMOrAbove = ['manager', 'owner', 'super_admin'].includes(user.role);
    const isAdminOrOwner = ['owner', 'super_admin'].includes(user.role);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
            
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white">Enterprise AI</h2>
                            <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')} Workspace</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <button
                            onClick={() => setActiveTab('copilot')}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'copilot' ? 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <span className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5" /> Copilot Chat
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                        </button>

                        <button
                            onClick={() => setActiveTab('standup')}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'standup' ? 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <span className="flex items-center gap-3">
                                <CheckSquare className="h-5 w-5" /> Daily Standup
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                        </button>

                        <button
                            onClick={() => setActiveTab('email')}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'email' ? 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <span className="flex items-center gap-3">
                                <Mail className="h-5 w-5" /> Email Assistant
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                        </button>

                        <button
                            onClick={() => setActiveTab('weekly')}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'weekly' ? 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <span className="flex items-center gap-3">
                                <FileText className="h-5 w-5" /> Weekly Performance
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                        </button>

                        {/* PM / Admin Gated Tab */}
                        {isPMOrAbove && (
                            <>
                                <div className="pt-4 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PM & Analytics</div>
                                <button
                                    onClick={() => setActiveTab('health')}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'health' ? 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                >
                                    <span className="flex items-center gap-3">
                                        <Activity className="h-5 w-5" /> Project/Task Health
                                    </span>
                                    <ChevronRight className="h-4 w-4 opacity-50" />
                                </button>

                                <button
                                    onClick={() => setActiveTab('burnout')}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'burnout' ? 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                >
                                    <span className="flex items-center gap-3">
                                        <Flame className="h-5 w-5" /> Team Burnout Heatmap
                                    </span>
                                    <ChevronRight className="h-4 w-4 opacity-50" />
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                {/* Scoped Dashboard Insights Card */}
                {roleDashboardData && (
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-indigo-400" />
                            <span className="text-xs font-semibold text-indigo-400">AI Recommendation</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium line-clamp-3">
                            {roleDashboardData.metricsSummary}
                        </p>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-10 flex flex-col justify-between max-w-7xl mx-auto w-full">
                
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Enterprise AI Engine</h1>
                        <p className="text-slate-400 text-sm mt-1">Role-aware orchestration powered by Mistral & ML models</p>
                    </div>
                    <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-semibold text-slate-300">Model: mistral-large-latest (Active)</span>
                    </div>
                </header>

                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        
                        {/* TAB 1: Copilot Chat */}
                        {activeTab === 'copilot' && (
                            <motion.div
                                key="copilot"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="flex flex-col h-[650px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
                            >
                                <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="h-5 w-5 text-violet-400" />
                                        <span className="font-semibold text-white">Interactive AI Copilot</span>
                                    </div>
                                    <span className="text-xs text-slate-400">Scoped to your permissions</span>
                                </div>

                                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                                    {copilotHistory.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                                            <Brain className="h-12 w-12 text-violet-500/80 mb-4 animate-pulse" />
                                            <h3 className="font-bold text-lg text-white">Ask anything about your tasks</h3>
                                            <p className="text-sm text-slate-400 mt-2">
                                                I have access to your workspace role profile. Ask for roadmap planning, task generation, or summary tips.
                                            </p>
                                        </div>
                                    )}
                                    {copilotHistory.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-2xl px-5 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-none shadow-md' : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'}`}>
                                                <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {loadingCopilot && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-800 px-5 py-3 rounded-2xl rounded-tl-none border border-slate-700/60 flex items-center gap-3">
                                                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                                                <span className="text-xs text-slate-400">Mistral is thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendCopilot} className="p-4 bg-slate-900/50 border-t border-slate-800 flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Type your instruction..."
                                        value={copilotInput}
                                        onChange={(e) => setCopilotInput(e.target.value)}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loadingCopilot}
                                        className="p-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium text-white transition disabled:opacity-50"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* TAB 2: Daily Standup */}
                        {activeTab === 'standup' && (
                            <motion.div
                                key="standup"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <CheckSquare className="h-5 w-5 text-indigo-400" /> Daily Standup Report
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-6">
                                        Generates a standard Scrum daily status update based on yesterday's commits, timer tracks, and today's outstanding backlogs.
                                    </p>
                                    <button
                                        onClick={handleGetDailyStandup}
                                        disabled={loadingStandup}
                                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loadingStandup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Generate Standup Update
                                    </button>
                                </div>

                                {standupResult && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                            <h4 className="font-semibold text-slate-400 text-xs uppercase tracking-wider mb-3">Completed Yesterday</h4>
                                            <p className="text-sm text-slate-200 leading-relaxed">{standupResult.yesterday}</p>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                            <h4 className="font-semibold text-slate-400 text-xs uppercase tracking-wider mb-3">Focusing Today</h4>
                                            <p className="text-sm text-slate-200 leading-relaxed">{standupResult.today}</p>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 border-amber-500/20 bg-amber-500/5">
                                            <h4 className="font-semibold text-amber-400 text-xs uppercase tracking-wider mb-3">Blockers & Critical Path</h4>
                                            <p className="text-sm text-slate-200 leading-relaxed">{standupResult.blockers}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB 3: Email Assistant */}
                        {activeTab === 'email' && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                            >
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <Mail className="h-5 w-5 text-indigo-400" /> AI Email Assistant
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Context / Subject Draft</label>
                                        <textarea
                                            placeholder="Write down the purpose of the email, e.g. notifying the client about delay on DB integration due to server crash..."
                                            value={emailContext}
                                            onChange={(e) => setEmailContext(e.target.value)}
                                            rows={5}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tone</label>
                                            <select
                                                value={emailTone}
                                                onChange={(e) => setEmailTone(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-600"
                                            >
                                                <option>Professional</option>
                                                <option>Empathetic</option>
                                                <option>Urgent</option>
                                                <option>Casual</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleEmailAssist}
                                        disabled={loadingEmail || !emailContext.trim()}
                                        className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Generate Email Draft
                                    </button>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
                                    <h4 className="font-semibold text-slate-400 text-xs uppercase tracking-wider mb-4">Generated Result</h4>
                                    {emailResult ? (
                                        <div className="flex-1 space-y-4">
                                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-750">
                                                <span className="text-xs text-slate-400 block font-semibold uppercase">Subject</span>
                                                <span className="text-sm font-medium text-white">{emailResult.subject}</span>
                                            </div>
                                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-750 flex-1 min-h-[250px] whitespace-pre-wrap text-sm text-slate-200">
                                                {emailResult.body}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl min-h-[300px]">
                                            <Mail className="h-10 w-10 mb-2 opacity-30" />
                                            <span className="text-sm">No email drafted yet.</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 4: Weekly Report */}
                        {activeTab === 'weekly' && (
                            <motion.div
                                key="weekly"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-400" /> Weekly AI Progress Report
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-6">
                                        Summarizes metrics, finished deliverables, and productivity metrics for the current sprint duration.
                                    </p>
                                    <button
                                        onClick={handleGetWeeklyReport}
                                        disabled={loadingWeekly}
                                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loadingWeekly ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Generate Weekly Report
                                    </button>
                                </div>

                                {weeklyReportResult && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                            <h4 className="font-semibold text-emerald-400 text-xs uppercase tracking-wider mb-4">Key Accomplishments</h4>
                                            <ul className="space-y-2">
                                                {weeklyReportResult.achievements.map((item, i) => (
                                                    <li key={i} className="text-sm text-slate-350 flex items-start gap-2">
                                                        <span className="text-emerald-500 mt-1">✓</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 border-red-500/10 bg-red-500/5">
                                            <h4 className="font-semibold text-red-400 text-xs uppercase tracking-wider mb-4">Current Challenges</h4>
                                            <ul className="space-y-2">
                                                {weeklyReportResult.challenges.map((item, i) => (
                                                    <li key={i} className="text-sm text-slate-350 flex items-start gap-2">
                                                        <span className="text-red-500 mt-1">⚠️</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                            <h4 className="font-semibold text-indigo-400 text-xs uppercase tracking-wider mb-4">Proposed Focus Areas</h4>
                                            <ul className="space-y-2">
                                                {weeklyReportResult.focusAreas.map((item, i) => (
                                                    <li key={i} className="text-sm text-slate-350 flex items-start gap-2">
                                                        <span className="text-indigo-500 mt-1">→</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB 5: Project / Task Health */}
                        {activeTab === 'health' && (
                            <motion.div
                                key="health"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                            >
                                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-indigo-400" /> Health Analyzer
                                    </h3>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Scope</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setHealthScoreType('project')}
                                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${healthScoreType === 'project' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                            >
                                                Project
                                            </button>
                                            <button
                                                onClick={() => setHealthScoreType('task')}
                                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${healthScoreType === 'task' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                            >
                                                Task ID
                                            </button>
                                        </div>
                                    </div>

                                    {healthScoreType === 'project' ? (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Project</label>
                                            <select
                                                value={healthScoreId}
                                                onChange={(e) => setHealthScoreId(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-600"
                                            >
                                                {projectsList.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Enter Task ID</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 42"
                                                value={healthScoreId}
                                                onChange={(e) => setHealthScoreId(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-600"
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGetHealthScore}
                                        disabled={loadingHealth || !healthScoreId}
                                        className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loadingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Analyze Health
                                    </button>
                                </div>

                                <div className="lg:col-span-2 space-y-6">
                                    {healthScoreResult ? (
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                                            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                                                <div>
                                                    <h4 className="font-bold text-white text-lg">{healthScoreResult.name}</h4>
                                                    <p className="text-slate-400 text-sm">Health Assessment</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold text-slate-400 block uppercase">Health Score</span>
                                                    <span className={`text-3xl font-black ${healthScoreResult.healthScore >= 75 ? 'text-emerald-450' : healthScoreResult.healthScore >= 50 ? 'text-amber-400' : 'text-red-500'}`}>
                                                        {healthScoreResult.healthScore}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Narrative Summary</span>
                                                    <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-800/80">
                                                        {healthScoreResult.narrative.summary}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">AI Suggestions</span>
                                                    <ul className="space-y-2 bg-slate-800/30 p-4 rounded-xl border border-slate-800/80">
                                                        {(healthScoreResult.narrative.suggestions || healthScoreResult.narrative.recommendations || []).map((sug, i) => (
                                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                                <span className="text-violet-400 font-bold">•</span> {sug}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            {healthScoreResult.contributingFactors?.length > 0 && (
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Contributing Factors</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {healthScoreResult.contributingFactors.map((fact, i) => (
                                                            <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700/80 text-slate-300 text-xs rounded-lg">
                                                                {fact}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full min-h-[300px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500">
                                            <Activity className="h-12 w-12 mb-3 opacity-25" />
                                            <p className="text-sm">Select an entity and click analyze to calculate ML health status.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 6: Burnout Heatmap */}
                        {activeTab === 'burnout' && (
                            <motion.div
                                key="burnout"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                            <Flame className="h-5 w-5 text-red-500" /> Team Burnout Heatmap
                                        </h3>
                                        <p className="text-sm text-slate-400">
                                            Evaluates active project resource workload, overdue tasks ratio, days since leaves, and calculates critical risk scores.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={selectedProject}
                                            onChange={(e) => setSelectedProject(e.target.value)}
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-600"
                                        >
                                            {projectsList.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleDetectTeamBurnout}
                                            disabled={loadingTeamBurnout || !selectedProject}
                                            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50 flex items-center gap-2 shrink-0"
                                        >
                                            {loadingTeamBurnout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                            Assess Project Team
                                        </button>
                                    </div>
                                </div>

                                {teamBurnoutResult && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {teamBurnoutResult.map((member, idx) => (
                                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-white text-base">{member.userName}</h4>
                                                        <span className="text-xs text-slate-400">Team Member Analysis</span>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${member.prediction.burnout_risk === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : member.prediction.burnout_risk === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : member.prediction.burnout_risk === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                                        {member.prediction.burnout_risk} risk ({(member.prediction.burnout_probability * 100).toFixed(0)}%)
                                                    </span>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-800/80">
                                                        {member.narrative.summary}
                                                    </p>
                                                    
                                                    <div>
                                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Wellness Plan Suggestions</span>
                                                        <ul className="space-y-1">
                                                            {member.narrative.recommendations.map((rec, i) => (
                                                                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                                                    <span className="text-indigo-400 font-bold">•</span> {rec}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                        
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default EnterpriseAIPage;
