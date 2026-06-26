import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getWorkspaces,
    toggleSuspendWorkspace,
    deleteWorkspace,
    getUsers,
    getProjects,
    getAnalytics,
    getAuditLogs,
    toggleBanUser,
    resetWorkspace
} from '../Services/superAdminApi';
import {
    Loader,
    Building2,
    Users,
    Briefcase,
    Activity,
    BarChart3,
    ShieldAlert,
    AlertTriangle,
    Mail,
    HardDrive,
    Trash2,
    Search,
    RefreshCw,
    ShieldCheck,
    Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SuperAdminConsole = () => {
    const { isLoggedIn, loading: authLoading, user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('workspaces');
    const [loading, setLoading] = useState(true);

    // Data States
    const [workspaces, setWorkspaces] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [projectsList, setProjectsList] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    // Filter/Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    // Redirect if not super admin
    useEffect(() => {
        if (!authLoading) {
            if (!isLoggedIn) {
                navigate('/login');
            } else if (user?.role !== 'super_admin') {
                toast.error('Forbidden: Super Admin Access Required');
                navigate('/dashboard');
            }
        }
    }, [isLoggedIn, authLoading, user, navigate]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [wData, uData, pData, aData, lData] = await Promise.all([
                getWorkspaces(),
                getUsers(),
                getProjects(),
                getAnalytics(),
                getAuditLogs()
            ]);
            setWorkspaces(wData);
            setUsersList(uData);
            setProjectsList(pData);
            setAnalytics(aData);
            setAuditLogs(lData);
        } catch (error) {
            console.error('Failed to load super admin panel details:', error);
            toast.error('Could not retrieve administrative console data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn && user?.role === 'super_admin') {
            loadData();
        }
    }, [isLoggedIn, user]);

    const handleToggleSuspend = async (workspaceId, currentStatus) => {
        const actionText = currentStatus === 'active' ? 'suspend' : 'reactivate';
        if (!window.confirm(`Are you sure you want to ${actionText} this workspace?`)) return;

        try {
            await toggleSuspendWorkspace(workspaceId);
            toast.success(`Workspace successfully ${actionText}ed.`);
            // Reload
            const updatedWorkspaces = await getWorkspaces();
            setWorkspaces(updatedWorkspaces);
            const updatedLogs = await getAuditLogs();
            setAuditLogs(updatedLogs);
        } catch (error) {
            console.error('Failed to toggle suspend status:', error);
            toast.error('Workspace moderation failed');
        }
    };

    const handleDeleteWorkspace = async (workspaceId, name) => {
        if (!window.confirm(`CRITICAL WARNING: This will permanently DELETE the workspace "${name}" and all its related databases (members, projects, tasks, leaves, files). This action is irreversible. Proceed?`)) return;

        try {
            await deleteWorkspace(workspaceId);
            toast.success('Workspace permanently expunged.');
            // Reload
            const updatedWorkspaces = await getWorkspaces();
            setWorkspaces(updatedWorkspaces);
            const updatedLogs = await getAuditLogs();
            setAuditLogs(updatedLogs);
            const updatedAnalytics = await getAnalytics();
            setAnalytics(updatedAnalytics);
        } catch (error) {
            console.error('Failed to delete workspace:', error);
            toast.error('Expunge operation failed');
        }
    };

    const handleToggleBanUser = async (userId, name, currentRole) => {
        const isBanned = currentRole === 'banned';
        const actionText = isBanned ? 'unban' : 'ban';
        if (!window.confirm(`Are you sure you want to ${actionText} user "${name}"?`)) return;

        try {
            await toggleBanUser(userId);
            toast.success(`User successfully ${actionText}ned.`);
            // Reload user list and logs
            const updatedUsers = await getUsers();
            setUsersList(updatedUsers);
            const updatedLogs = await getAuditLogs();
            setAuditLogs(updatedLogs);
        } catch (error) {
            console.error('Failed to toggle ban status:', error);
            toast.error('User moderation failed');
        }
    };

    const handleResetWorkspace = async (workspaceId, name) => {
        if (!window.confirm(`CRITICAL WARNING: This will permanently DELETE all projects, tasks, comments, and attachments in workspace "${name}". Organization records and members will be preserved. Proceed?`)) return;

        try {
            await resetWorkspace(workspaceId);
            toast.success('Workspace successfully reset.');
            // Reload logs and analytics
            const updatedLogs = await getAuditLogs();
            setAuditLogs(updatedLogs);
            const updatedAnalytics = await getAnalytics();
            setAnalytics(updatedAnalytics);
        } catch (error) {
            console.error('Failed to reset workspace:', error);
            toast.error('Workspace reset failed');
        }
    };

    // Filtered lists
    const filteredWorkspaces = workspaces.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.ownerEmail && w.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredUsers = usersList.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.position && u.position.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredLogs = auditLogs.filter(l => {
        const matchesSearch =
            l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.userEmail && l.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesAction = actionFilter === 'all' || l.action.toLowerCase().includes(actionFilter.toLowerCase());
        return matchesSearch && matchesAction;
    });

    if (authLoading || (loading && !analytics)) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-semibold animate-pulse">Loading Platform Moderation Console...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080d1a] text-slate-200 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-white/10 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-blue-400" />
                            System Moderator Portal
                        </h1>
                        <p className="text-slate-400 mt-1 font-medium font-sans">Global Platform Oversight, Workspace Moderation, Resource Metrics, and System Integrity Audits.</p>
                    </div>

                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-300" />
                        Sync Registry
                    </button>
                </div>

                {/* System Metrics Cards */}
                {analytics && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Global Accounts</span>
                                <span className="text-xl font-extrabold text-white mt-0.5 block">{analytics.system?.totalUsers}</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-purple-500/10 rounded-xl text-purple-400">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Workspaces</span>
                                <span className="text-xl font-extrabold text-white mt-0.5 block">{analytics.system?.totalWorkspaces}</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Projects</span>
                                <span className="text-xl font-extrabold text-white mt-0.5 block">{analytics.system?.totalProjects}</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Storage Allocation</span>
                                <span className="text-xl font-extrabold text-white mt-0.5 block">{analytics.storage?.totalSizeMB} MB</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl mb-8">
                    {[
                        { id: 'workspaces', name: 'Workspaces', icon: Building2 },
                        { id: 'users', name: 'User Directory', icon: Users },
                        { id: 'projects', name: 'Projects', icon: Briefcase },
                        { id: 'analytics', name: 'AI & Usage Analytics', icon: BarChart3 },
                        { id: 'audit-logs', name: 'Global Audit Logs', icon: Activity }
                    ].map(t => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setActiveTab(t.id);
                                    setSearchTerm('');
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                                    activeTab === t.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-500/30'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {t.name}
                            </button>
                        );
                    })}
                </div>

                {/* Sub Tab Contents */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                    {/* Search Panel (if not in analytics) */}
                    {activeTab !== 'analytics' && (
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder={`Filter ${activeTab}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-250 placeholder-slate-500"
                                />
                            </div>

                            {activeTab === 'audit-logs' && (
                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-bold text-slate-350 focus:outline-none"
                                >
                                    <option value="all" className="bg-slate-900">All Log Actions</option>
                                    <option value="create" className="bg-slate-900">CREATE events</option>
                                    <option value="update" className="bg-slate-900">UPDATE events</option>
                                    <option value="delete" className="bg-slate-900">DELETE events</option>
                                    <option value="join" className="bg-slate-900">JOIN events</option>
                                    <option value="suspend" className="bg-slate-900">SUSPEND events</option>
                                </select>
                            )}
                        </div>
                    )}

                    {/* TAB: WORKSPACES */}
                    {activeTab === 'workspaces' && (
                        <div className="overflow-x-auto">
                            {filteredWorkspaces.length === 0 ? (
                                <p className="text-xs text-slate-500 py-10 text-center font-sans">No workspaces match filters.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                            <th className="pb-3 pr-4">Workspace Name</th>
                                            <th className="pb-3 pr-4">Slug / Slug Vector</th>
                                            <th className="pb-3 pr-4">Creator Owner</th>
                                            <th className="pb-3 pr-4">Invite Code</th>
                                            <th className="pb-3 pr-4">Status</th>
                                            <th className="pb-3 text-right">Moderation Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredWorkspaces.map(w => (
                                            <tr key={w.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="py-3.5 font-bold text-white pr-4">{w.name}</td>
                                                <td className="py-3.5 font-mono text-indigo-300 pr-4">/{w.slug}</td>
                                                <td className="py-3.5 pr-4">
                                                    <div>
                                                        <span className="font-semibold block">{w.ownerName || 'System'}</span>
                                                        <span className="text-[10px] text-slate-500 block">{w.ownerEmail || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 font-mono text-slate-400 pr-4">{w.inviteCode}</td>
                                                <td className="py-3.5 pr-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                                        w.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right flex items-center justify-end gap-2.5">
                                                    <button
                                                        onClick={() => handleToggleSuspend(w.id, w.status)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                                                            w.status === 'active'
                                                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        }`}
                                                    >
                                                        {w.status === 'active' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                        {w.status === 'active' ? 'Suspend' : 'Reactivate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetWorkspace(w.id, w.name)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition cursor-pointer"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                        Reset
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteWorkspace(w.id, w.name)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Expunge
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* TAB: USERS */}
                    {activeTab === 'users' && (
                        <div className="overflow-x-auto">
                            {filteredUsers.length === 0 ? (
                                <p className="text-xs text-slate-500 py-10 text-center font-sans">No user accounts found matching query.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                            <th className="pb-3 pr-4">User Name</th>
                                            <th className="pb-3 pr-4">Email Address</th>
                                            <th className="pb-3 pr-4">Global System Role</th>
                                            <th className="pb-3 pr-4">Job Title</th>
                                            <th className="pb-3 pr-4">Phone Number</th>
                                            <th className="pb-3 pr-4">Join Date</th>
                                            <th className="pb-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="py-3.5 font-bold text-white pr-4">{u.name}</td>
                                                <td className="py-3.5 font-mono text-slate-400 pr-4">{u.email}</td>
                                                <td className="py-3.5 pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                        u.role === 'super_admin'
                                                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                                                            : u.role === 'admin'
                                                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                                                                : u.role === 'banned'
                                                                    ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                                                    : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-slate-300 pr-4">{u.position || 'Unassigned'}</td>
                                                <td className="py-3.5 text-slate-400 pr-4 font-mono">{u.phone || 'N/A'}</td>
                                                <td className="py-3.5 font-mono text-slate-450 pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                <td className="py-3.5 text-right">
                                                    {u.role !== 'super_admin' && (
                                                        <button
                                                            onClick={() => handleToggleBanUser(u.id, u.name, u.role)}
                                                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                                                                u.role === 'banned'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                            }`}
                                                        >
                                                            {u.role === 'banned' ? 'Unban' : 'Ban User'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* TAB: PROJECTS */}
                    {activeTab === 'projects' && (
                        <div className="overflow-x-auto">
                            {projectsList.length === 0 ? (
                                <p className="text-xs text-slate-500 py-10 text-center font-sans">No platform projects found.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                            <th className="pb-3 pr-4">Project Name</th>
                                            <th className="pb-3 pr-4">Workspace Context</th>
                                            <th className="pb-3 pr-4">Deliverable Status</th>
                                            <th className="pb-3 text-right">Created Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {projectsList.map(p => (
                                            <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="py-3.5 font-bold text-white pr-4">{p.name}</td>
                                                <td className="py-3.5 text-indigo-300 pr-4 font-semibold">{p.workspaceName}</td>
                                                <td className="py-3.5 pr-4">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right font-mono text-slate-450">{new Date(p.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* TAB: ANALYTICS */}
                    {activeTab === 'analytics' && analytics && (
                        <div className="space-y-8 animate-in fade-in">
                            {/* Breakdown grids */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* AI Usage breakdown */}
                                <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                                    <h4 className="font-bold text-sm text-slate-200 mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-blue-400" />
                                        Mistral AI Tokens Distribution
                                    </h4>
                                    <p className="text-xxs text-slate-450 font-bold uppercase mb-4">Total Tokens Used: {analytics.ai?.totalTokens}</p>
                                    
                                    <div className="space-y-4">
                                        {analytics.ai?.breakdown?.map((b, idx) => (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-semibold">
                                                    <span className="text-slate-300">{b.type}</span>
                                                    <span className="text-slate-400 font-mono">{b.tokens} tokens ({b.count} reqs)</span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (b.tokens / (analytics.ai.totalTokens || 1)) * 100)}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                        {analytics.ai?.breakdown?.length === 0 && (
                                            <p className="text-xs text-slate-500 py-6 text-center">No AI usage logged yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Email usage logs */}
                                <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                                    <h4 className="font-bold text-sm text-slate-200 mb-4 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-purple-400" />
                                        Email Notification Volume (Brevo)
                                    </h4>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                        {analytics.email?.map((em, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <div>
                                                    <span className="font-bold text-slate-200 block">{em.eventType}</span>
                                                    <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Total Triggered: {em.count}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                                        Sent: {em.sent}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                                                        Failed: {em.failed}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {analytics.email?.length === 0 && (
                                            <p className="text-xs text-slate-500 py-6 text-center font-sans">No email logs captured.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: AUDIT LOGS */}
                    {activeTab === 'audit-logs' && (
                        <div className="overflow-x-auto">
                            {filteredLogs.length === 0 ? (
                                <p className="text-xs text-slate-500 py-10 text-center font-sans">No platform actions match filter criteria.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                                            <th className="pb-3 pr-4">Action</th>
                                            <th className="pb-3 pr-4">Entity Context</th>
                                            <th className="pb-3 pr-4">Action Description Details</th>
                                            <th className="pb-3 pr-4">Trigger User</th>
                                            <th className="pb-3 pr-4">IP Address</th>
                                            <th className="pb-3 text-right">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredLogs.map(l => (
                                            <tr key={l.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="py-3.5 pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                        l.action.includes('DELETE') || l.action.includes('SUSPEND')
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : l.action.includes('CREATE') || l.action.includes('APPROVE')
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                    }`}>
                                                        {l.action}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 font-mono text-indigo-300 pr-4 uppercase text-[10px]">
                                                    {l.entityType} (ID: {l.entityId || 'N/A'})
                                                </td>
                                                <td className="py-3.5 text-slate-200 pr-4 font-semibold max-w-xs truncate">{l.details}</td>
                                                <td className="py-3.5 pr-4">
                                                    <div>
                                                        <span className="font-semibold block">{l.userName || 'System'}</span>
                                                        <span className="text-[10px] text-slate-500 block font-mono">{l.userEmail || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 font-mono text-slate-450 pr-4">{l.ipAddress || 'unknown'}</td>
                                                <td className="py-3.5 text-right font-mono text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminConsole;
