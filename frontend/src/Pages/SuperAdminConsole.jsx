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
    Eye,
    X
} from 'lucide-react';
import { getEmailLogs, retryEmailLog, getAutomationLogs } from '../Services/notificationApi';
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

    // Email & Automation logs States
    const [emailLogsList, setEmailLogsList] = useState([]);
    const [automationLogsList, setAutomationLogsList] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [emailFilter, setEmailFilter] = useState('all');
    const [emailLogsLoading, setEmailLogsLoading] = useState(false);
    const [automationLogsLoading, setAutomationLogsLoading] = useState(false);

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

    // Fetch Email Logs & Automation Logs when email-logs tab is activated
    useEffect(() => {
        if (isLoggedIn && user?.role === 'super_admin' && activeTab === 'email-logs') {
            fetchEmailLogs();
            fetchAutomationLogs();
        }
    }, [activeTab, emailFilter]);

    const fetchEmailLogs = async () => {
        try {
            setEmailLogsLoading(true);
            const res = await getEmailLogs({
                status: emailFilter === 'all' ? undefined : emailFilter,
                limit: 50
            });
            setEmailLogsList(res?.data || []);
        } catch (error) {
            console.error('Failed to fetch email logs:', error);
            toast.error('Failed to retrieve email logs');
        } finally {
            setEmailLogsLoading(false);
        }
    };

    const fetchAutomationLogs = async () => {
        try {
            setAutomationLogsLoading(true);
            const res = await getAutomationLogs({ limit: 50 });
            setAutomationLogsList(res?.data || []);
        } catch (error) {
            console.error('Failed to fetch automation logs:', error);
            toast.error('Failed to retrieve automation logs');
        } finally {
            setAutomationLogsLoading(false);
        }
    };

    const handleRetryEmail = async (logId) => {
        try {
            toast.loading('Enqueuing email retry...', { id: 'retry-email' });
            await retryEmailLog(logId);
            toast.success('Email successfully enqueued for retry!', { id: 'retry-email' });
            fetchEmailLogs();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to retry email delivery', { id: 'retry-email' });
        }
    };

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
            <div className="min-h-screen flex flex-col items-center justify-center text-ink">
                <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-ink-soft font-semibold animate-pulse">Loading Platform Moderation Console...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-line mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-blue-400" />
                            System Moderator Portal
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">Global Platform Oversight, Workspace Moderation, Resource Metrics, and System Integrity Audits.</p>
                    </div>

                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-bold hover:bg-surface-2 transition cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4 text-ink" />
                        Sync Registry
                    </button>
                </div>

                {/* System Metrics Cards */}
                {analytics && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Global Accounts</span>
                                <span className="text-xl font-extrabold text-ink mt-0.5 block">{analytics.system?.totalUsers}</span>
                            </div>
                        </div>

                        <div className="bg-surface-2 border border-line p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-purple-500/10 rounded-xl text-purple-400">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Active Workspaces</span>
                                <span className="text-xl font-extrabold text-ink mt-0.5 block">{analytics.system?.totalWorkspaces}</span>
                            </div>
                        </div>

                        <div className="bg-surface-2 border border-line p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Total Projects</span>
                                <span className="text-xl font-extrabold text-ink mt-0.5 block">{analytics.system?.totalProjects}</span>
                            </div>
                        </div>

                        <div className="bg-surface-2 border border-line p-5 rounded-2xl flex items-center gap-4">
                            <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Storage Allocation</span>
                                <span className="text-xl font-extrabold text-ink mt-0.5 block">{analytics.storage?.totalSizeMB} MB</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 bg-surface-2 border border-line p-1.5 rounded-2xl mb-8">
                    {[
                        { id: 'workspaces', name: 'Workspaces', icon: Building2 },
                        { id: 'users', name: 'User Directory', icon: Users },
                        { id: 'projects', name: 'Projects', icon: Briefcase },
                        { id: 'analytics', name: 'AI & Usage Analytics', icon: BarChart3 },
                        { id: 'audit-logs', name: 'Global Audit Logs', icon: Activity },
                        { id: 'email-logs', name: 'Email & Automations', icon: Mail }
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
                                        : 'text-ink-soft hover:text-ink hover:bg-surface-2'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {t.name}
                            </button>
                        );
                    })}
                </div>

                {/* Sub Tab Contents */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl backdrop-blur-md">
                    {/* Search Panel (if not in analytics) */}
                    {activeTab !== 'analytics' && (
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink0" />
                                <input
                                    type="text"
                                    placeholder={`Filter ${activeTab}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-ink placeholder-ink-faint"
                                />
                            </div>

                            {activeTab === 'audit-logs' && (
                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="px-4 py-2.5 bg-surface-2 border border-line rounded-xl text-xs font-bold text-ink focus:outline-none"
                                >
                                    <option value="all" className="bg-surface-2">All Log Actions</option>
                                    <option value="create" className="bg-surface-2">CREATE events</option>
                                    <option value="update" className="bg-surface-2">UPDATE events</option>
                                    <option value="delete" className="bg-surface-2">DELETE events</option>
                                    <option value="join" className="bg-surface-2">JOIN events</option>
                                    <option value="suspend" className="bg-surface-2">SUSPEND events</option>
                                </select>
                            )}
                        </div>
                    )}

                    {/* TAB: WORKSPACES */}
                    {activeTab === 'workspaces' && (
                        <div className="overflow-x-auto">
                            {filteredWorkspaces.length === 0 ? (
                                <p className="text-xs text-ink0 py-10 text-center font-sans">No workspaces match filters.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-line text-[10px] font-bold text-ink-soft uppercase tracking-wider">
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
                                            <tr key={w.id} className="hover:bg-surface-2 transition-colors">
                                                <td className="py-3.5 font-bold text-ink pr-4">{w.name}</td>
                                                <td className="py-3.5 font-mono text-indigo-300 pr-4">/{w.slug}</td>
                                                <td className="py-3.5 pr-4">
                                                    <div>
                                                        <span className="font-semibold block">{w.ownerName || 'System'}</span>
                                                        <span className="text-[10px] text-ink0 block">{w.ownerEmail || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 font-mono text-ink-soft pr-4">{w.inviteCode}</td>
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
                                <p className="text-xs text-ink0 py-10 text-center font-sans">No user accounts found matching query.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-line text-[10px] font-bold text-ink-soft uppercase tracking-wider">
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
                                            <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                                                <td className="py-3.5 font-bold text-ink pr-4">{u.name}</td>
                                                <td className="py-3.5 font-mono text-ink-soft pr-4">{u.email}</td>
                                                <td className="py-3.5 pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                        u.role === 'super_admin'
                                                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                                                            : u.role === 'admin'
                                                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                                                                : u.role === 'banned'
                                                                    ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                                                    : 'bg-slate-500/15 text-ink-soft border-slate-500/25'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-ink pr-4">{u.position || 'Unassigned'}</td>
                                                <td className="py-3.5 text-ink-soft pr-4 font-mono">{u.phone || 'N/A'}</td>
                                                <td className="py-3.5 font-mono text-ink-soft pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
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
                                <p className="text-xs text-ink0 py-10 text-center font-sans">No platform projects found.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-line text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                                            <th className="pb-3 pr-4">Project Name</th>
                                            <th className="pb-3 pr-4">Workspace Context</th>
                                            <th className="pb-3 pr-4">Deliverable Status</th>
                                            <th className="pb-3 text-right">Created Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {projectsList.map(p => (
                                            <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                                                <td className="py-3.5 font-bold text-ink pr-4">{p.name}</td>
                                                <td className="py-3.5 text-indigo-300 pr-4 font-semibold">{p.workspaceName}</td>
                                                <td className="py-3.5 pr-4">
                                                    <span className="text-[10px] font-bold text-ink-soft uppercase bg-surface-2 px-2 py-0.5 rounded border border-line">
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right font-mono text-ink-soft">{new Date(p.createdAt).toLocaleDateString()}</td>
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
                                <div className="bg-surface-2 border border-line p-6 rounded-2xl">
                                    <h4 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-blue-400" />
                                        Mistral AI Tokens Distribution
                                    </h4>
                                    <p className="text-xxs text-ink-soft font-bold uppercase mb-4">Total Tokens Used: {analytics.ai?.totalTokens}</p>
                                    
                                    <div className="space-y-4">
                                        {analytics.ai?.breakdown?.map((b, idx) => (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-semibold">
                                                    <span className="text-ink">{b.type}</span>
                                                    <span className="text-ink-soft font-mono">{b.tokens} tokens ({b.count} reqs)</span>
                                                </div>
                                                <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (b.tokens / (analytics.ai.totalTokens || 1)) * 100)}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                        {analytics.ai?.breakdown?.length === 0 && (
                                            <p className="text-xs text-ink0 py-6 text-center">No AI usage logged yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Email usage logs */}
                                <div className="bg-surface-2 border border-line p-6 rounded-2xl">
                                    <h4 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-purple-400" />
                                        Email Notification Volume (Brevo)
                                    </h4>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                        {analytics.email?.map((em, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-3 bg-surface-2 border border-line rounded-xl">
                                                <div>
                                                    <span className="font-bold text-ink block">{em.eventType}</span>
                                                    <span className="text-[10px] text-ink-soft block font-semibold mt-0.5">Total Triggered: {em.count}</span>
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
                                            <p className="text-xs text-ink0 py-6 text-center font-sans">No email logs captured.</p>
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
                                <p className="text-xs text-ink0 py-10 text-center font-sans">No platform actions match filter criteria.</p>
                            ) : (
                                <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                    <thead>
                                        <tr className="border-b border-line text-[10px] font-bold text-slate-455 uppercase tracking-wider">
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
                                            <tr key={l.id} className="hover:bg-surface-2 transition-colors">
                                                <td className="py-3.5 pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                        l.action.includes('DELETE') || l.action.includes('SUSPEND')
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : l.action.includes('CREATE') || l.action.includes('APPROVE')
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : 'bg-slate-500/10 text-ink-soft border-slate-500/20'
                                                    }`}>
                                                        {l.action}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 font-mono text-indigo-300 pr-4 uppercase text-[10px]">
                                                    {l.entityType} (ID: {l.entityId || 'N/A'})
                                                </td>
                                                <td className="py-3.5 text-ink pr-4 font-semibold max-w-xs truncate">{l.details}</td>
                                                <td className="py-3.5 pr-4">
                                                    <div>
                                                        <span className="font-semibold block">{l.userName || 'System'}</span>
                                                        <span className="text-[10px] text-ink0 block font-mono">{l.userEmail || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 font-mono text-ink-soft pr-4">{l.ipAddress || 'unknown'}</td>
                                                <td className="py-3.5 text-right font-mono text-ink0">{new Date(l.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* TAB: EMAIL & AUTOMATIONS */}
                    {activeTab === 'email-logs' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            {/* Grid Layout for Emails & Automations */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                
                                {/* Email Delivery Queue (2/3 width) */}
                                <div className="xl:col-span-2 bg-surface-2 border border-line p-6 rounded-2xl space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-line">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-blue-400" />
                                                Email Delivery Queue & Logs
                                            </h3>
                                            <p className="text-[10px] text-ink-soft font-bold mt-0.5">Real-time status of outgoing transactional & automated emails</p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {['all', 'queued', 'sent', 'failed'].map((st) => (
                                                <button
                                                    key={st}
                                                    onClick={() => setEmailFilter(st)}
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                                                        emailFilter === st
                                                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 font-extrabold'
                                                            : 'bg-surface-2 text-ink-soft border-line hover:bg-surface-2 hover:text-ink'
                                                    }`}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {emailLogsLoading && emailLogsList.length === 0 ? (
                                        <div className="py-20 flex items-center justify-center">
                                            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                                        </div>
                                    ) : emailLogsList.length === 0 ? (
                                        <p className="text-xs text-ink0 py-16 text-center font-sans">No email delivery logs found.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                                <thead>
                                                    <tr className="border-b border-line text-[9px] font-bold text-ink-soft uppercase tracking-wider">
                                                        <th className="pb-3 pr-2">Recipient</th>
                                                        <th className="pb-3 pr-2">Subject</th>
                                                        <th className="pb-3 pr-2">Type</th>
                                                        <th className="pb-3 pr-2">Status</th>
                                                        <th className="pb-3 pr-2">Retries</th>
                                                        <th className="pb-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {emailLogsList.map((log) => (
                                                        <tr key={log.id} className="hover:bg-surface-2 transition-colors">
                                                            <td className="py-3 pr-2">
                                                                <span className="font-semibold text-ink block truncate max-w-[150px]">{log.recipient}</span>
                                                                {log.sentAt && (
                                                                    <span className="text-[9px] text-ink0 block font-mono">
                                                                        {new Date(log.sentAt).toLocaleTimeString()}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 pr-2 text-ink-soft max-w-[180px] truncate font-medium">{log.subject}</td>
                                                            <td className="py-3 pr-2 font-mono text-[9px] text-indigo-400 uppercase">{log.eventType}</td>
                                                            <td className="py-3 pr-2">
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                                    log.status === 'sent'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                        : log.status === 'failed'
                                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                            : log.status === 'queued'
                                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                                }`}>
                                                                    {log.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 pr-2 font-mono text-center text-ink-soft">{log.retryCount ?? 0}</td>
                                                            <td className="py-3 text-right space-x-2">
                                                                <button
                                                                    onClick={() => setSelectedEmail(log)}
                                                                    className="px-2 py-1 rounded bg-surface-2 border border-line text-[9px] font-bold text-ink hover:bg-surface-2 transition cursor-pointer"
                                                                >
                                                                    Preview HTML
                                                                </button>
                                                                {log.status === 'failed' && (
                                                                    <button
                                                                        onClick={() => handleRetryEmail(log.id)}
                                                                        className="px-2 py-1 rounded bg-blue-600/20 border border-blue-500/30 text-[9px] font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                                                                    >
                                                                        Retry
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Cron Job Automation Logs (1/3 width) */}
                                <div className="bg-surface-2 border border-line p-6 rounded-2xl space-y-4">
                                    <div className="pb-4 border-b border-line">
                                        <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider flex items-center gap-2">
                                            <RefreshCw className="w-4 h-4 text-purple-400" />
                                            Cron Job Scheduler Logs
                                        </h3>
                                        <p className="text-[10px] text-ink-soft font-bold mt-0.5">Audit history of automated daily, weekly, & trigger jobs</p>
                                    </div>

                                    {automationLogsLoading && automationLogsList.length === 0 ? (
                                        <div className="py-16 flex items-center justify-center">
                                            <Loader className="w-6 h-6 text-purple-500 animate-spin" />
                                        </div>
                                    ) : automationLogsList.length === 0 ? (
                                        <p className="text-xs text-ink0 py-12 text-center font-sans">No automation logs recorded.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                            {automationLogsList.map((log) => (
                                                <div 
                                                    key={log.id} 
                                                    className="p-3 bg-surface-2 border border-line rounded-xl space-y-1.5 hover:border-line transition"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-ink uppercase tracking-wide">{log.jobName}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                            log.status === 'success'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-[10px] text-ink-soft leading-normal font-sans">{log.summary}</p>
                                                    
                                                    <div className="flex justify-between items-center text-[8px] font-semibold text-ink0 font-mono pt-1">
                                                        <span>ID: {log.id}</span>
                                                        <span>{new Date(log.runAt).toLocaleTimeString()} {new Date(log.runAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* HTML Email Preview Modal */}
            <AnimatePresence>
                {selectedEmail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEmail(null)}
                            className="absolute inset-0 bg-surface-2 backdrop-blur-sm"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            className="relative bg-surface-2 border border-line w-full max-w-3xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-line bg-surface-2 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xs font-black uppercase text-ink-soft tracking-wider">Email HTML Content Preview</h3>
                                    <span className="text-[10px] text-ink0 font-bold block mt-0.5">{selectedEmail.subject}</span>
                                </div>
                                <button 
                                    onClick={() => setSelectedEmail(null)}
                                    className="p-1.5 rounded-lg bg-surface-2 border border-line text-ink-soft hover:text-ink hover:bg-surface-2 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Iframe Content */}
                            <div className="flex-1 bg-surface-2 p-2">
                                <iframe
                                    title="Email Preview"
                                    srcDoc={selectedEmail.htmlContent}
                                    className="w-full h-full border-none rounded-xl bg-surface-2"
                                    sandbox="allow-same-origin"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-line bg-surface-2 flex justify-between items-center">
                                <div className="text-[9px] font-bold text-ink0">
                                    Recipient: <span className="text-ink font-mono">{selectedEmail.recipient}</span>
                                </div>
                                <div className="space-x-3">
                                    {selectedEmail.status === 'failed' && (
                                        <button
                                            onClick={() => {
                                                handleRetryEmail(selectedEmail.id);
                                                setSelectedEmail(null);
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white font-extrabold rounded-xl text-xs hover:shadow-lg transition cursor-pointer"
                                        >
                                            Retry Sending Email
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedEmail(null)}
                                        className="px-4 py-2 bg-surface-2 text-ink hover:bg-surface-2 font-bold rounded-xl text-xs transition cursor-pointer"
                                    >
                                        Close Preview
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SuperAdminConsole;
