import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    submitWorkLog, getMyWorkLogs, getTeamWorkLogs, getWorkLogAnalytics,
    approveWorkLog, rejectWorkLog, requestWorkLogChanges, bulkApproveWorkLogs
} from '../Services/workLogApi';
import { getTasks } from '../Services/taskApi';
import { getProjects } from '../Services/projectApi';
import ImageKitUpload from '../Components/ImageKitUpload';
import {
    NotebookPen, Plus, Loader2, CheckCircle2, XCircle, RotateCcw, Clock,
    Github, Paperclip, ClipboardList, TrendingUp, Users, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const MANAGER_ROLES = ['owner', 'admin', 'manager', 'super_admin'];

const STATUS_STYLES = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    changes_requested: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

const STATUS_LABELS = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes Requested',
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const WorkLogPage = () => {
    const { user } = useAuth();
    const isManager = MANAGER_ROLES.includes(user?.role);

    const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'team'
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [myLogs, setMyLogs] = useState([]);
    const [teamLogs, setTeamLogs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [reviewNote, setReviewNote] = useState({});

    const emptyForm = {
        title: '', taskId: '', projectId: '', logDate: todayStr(), startTime: '', endTime: '',
        hoursWorked: '', progressPercent: 0, description: '', challenges: '', tomorrowPlan: '',
        gitCommitUrl: '', attachments: []
    };
    const [form, setForm] = useState(emptyForm);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [logsList, tasksList, projectsList] = await Promise.all([
                getMyWorkLogs(),
                getTasks(),
                getProjects()
            ]);
            setMyLogs(logsList || []);
            setTasks(tasksList || []);
            setProjects(projectsList || []);

            if (isManager) {
                const [team, stats] = await Promise.all([getTeamWorkLogs(), getWorkLogAnalytics()]);
                setTeamLogs(team || []);
                setAnalytics(stats || null);
            }
        } catch (error) {
            console.error('Failed to load work logs:', error);
            toast.error('Could not load work log data.');
        } finally {
            setLoading(false);
        }
    }, [isManager]);

    useEffect(() => {
        loadData();
    }, [loadData, user?.activeWorkspaceId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim() || form.hoursWorked === '') {
            toast.error('Title, description, and hours worked are required');
            return;
        }
        try {
            setSubmitting(true);
            await submitWorkLog({
                ...form,
                taskId: form.taskId || null,
                projectId: form.projectId || null,
                hoursWorked: parseFloat(form.hoursWorked),
                progressPercent: parseInt(form.progressPercent, 10) || 0,
                gitCommitUrl: form.gitCommitUrl || null,
            });
            toast.success('Work log submitted for review! 📝');
            setShowFormModal(false);
            setForm(emptyForm);
            loadData();
        } catch (error) {
            console.error('Failed to submit work log:', error);
            toast.error(error.response?.data?.message || 'Failed to submit work log');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReview = async (id, action) => {
        const note = reviewNote[id] || '';
        try {
            if (action === 'approve') await approveWorkLog(id, note);
            else if (action === 'reject') await rejectWorkLog(id, note);
            else await requestWorkLogChanges(id, note);
            toast.success(`Work log ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for changes'}.`);
            loadData();
        } catch (error) {
            console.error('Failed to review work log:', error);
            toast.error(error.response?.data?.message || 'Review action failed');
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        try {
            const data = await bulkApproveWorkLogs(selectedIds);
            if (data?.failed?.length) {
                toast.error(`Approved ${data.approved}, ${data.failed.length} failed.`);
            } else {
                toast.success(`Approved ${selectedIds.length} work log(s).`);
            }
            setSelectedIds([]);
            loadData();
        } catch (error) {
            console.error('Bulk approve failed:', error);
            toast.error('Bulk approve failed');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const pendingTeamLogs = teamLogs.filter(l => l.status === 'pending');

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-line mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                            <NotebookPen className="w-8 h-8 text-indigo-400" />
                            Daily Work Log
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">
                            Record daily progress, attach evidence, and route it through manager approval.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowFormModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white hover:shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Submit Work Log
                    </button>
                </div>

                {/* Tabs (manager only) */}
                {isManager && (
                    <div className="flex items-center gap-2 mb-8">
                        <button
                            onClick={() => setActiveTab('mine')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'mine' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-surface-2 border border-line text-ink-soft hover:text-ink'}`}
                        >
                            My Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeTab === 'team' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-surface-2 border border-line text-ink-soft hover:text-ink'}`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Team Review
                            {pendingTeamLogs.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black">
                                    {pendingTeamLogs.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Analytics strip (manager, team tab) */}
                {isManager && activeTab === 'team' && analytics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Total Logs</span>
                            <span className="text-xl font-extrabold text-ink mt-0.5 block">{analytics.totalLogs}</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Pending</span>
                            <span className="text-xl font-extrabold text-amber-400 mt-0.5 block">{analytics.pendingCount}</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Approved</span>
                            <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">{analytics.approvedCount}</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Total Hours</span>
                            <span className="text-xl font-extrabold text-ink mt-0.5 block">{Number(analytics.totalHours).toFixed(1)}h</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Avg Progress</span>
                            <span className="text-xl font-extrabold text-indigo-400 mt-0.5 block">{Number(analytics.avgProgress).toFixed(0)}%</span>
                        </div>
                    </div>
                )}

                {/* Bulk approve bar */}
                {isManager && activeTab === 'team' && selectedIds.length > 0 && (
                    <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-xs font-bold text-ink">{selectedIds.length} log(s) selected</span>
                        <button
                            onClick={handleBulkApprove}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition cursor-pointer"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Bulk Approve
                        </button>
                    </div>
                )}

                {/* Main table */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl backdrop-blur-md flex-1">
                    <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-indigo-400" />
                        {activeTab === 'team' ? 'Team Submissions' : 'My Submissions'}
                    </h3>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                            <span className="text-xs">Gathering work logs...</span>
                        </div>
                    ) : (activeTab === 'team' ? teamLogs : myLogs).length === 0 ? (
                        <p className="text-xs text-ink-soft py-10 text-center font-sans">No work logs found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                <thead>
                                    <tr className="border-b border-line text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                                        {activeTab === 'team' && <th className="pb-3 pr-2 w-8"></th>}
                                        <th className="pb-3 pr-4">Title</th>
                                        {activeTab === 'team' && <th className="pb-3 pr-4">Employee</th>}
                                        <th className="pb-3 pr-4">Date</th>
                                        <th className="pb-3 pr-4">Project / Task</th>
                                        <th className="pb-3 pr-4 text-right">Hours</th>
                                        <th className="pb-3 pr-4">Progress</th>
                                        <th className="pb-3 pr-4">Status</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(activeTab === 'team' ? teamLogs : myLogs).map(log => (
                                        <tr key={log.id} className="hover:bg-surface-2 transition-colors align-top">
                                            {activeTab === 'team' && (
                                                <td className="py-3.5 pr-2">
                                                    {log.status === 'pending' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(log.id)}
                                                            onChange={() => toggleSelect(log.id)}
                                                            className="cursor-pointer"
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            <td className="py-3.5 font-bold text-ink pr-4">
                                                {log.title}
                                                {log.gitCommitUrl && (
                                                    <a href={log.gitCommitUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-ink-soft hover:text-ink">
                                                        <Github className="w-3 h-3" />
                                                    </a>
                                                )}
                                                <p className="text-ink-soft font-normal mt-1 max-w-xs line-clamp-2">{log.description}</p>
                                            </td>
                                            {activeTab === 'team' && (
                                                <td className="py-3.5 pr-4">
                                                    <div className="font-semibold text-ink">{log.employeeName}</div>
                                                    <div className="text-ink-soft text-[10px]">{log.employeeEmail}</div>
                                                </td>
                                            )}
                                            <td className="py-3.5 font-mono text-ink-soft pr-4">{log.logDate}</td>
                                            <td className="py-3.5 pr-4">
                                                {log.projectName && <span className="block text-ink-soft">{log.projectName}</span>}
                                                {log.taskTitle && (
                                                    <span className="px-2 py-0.5 rounded bg-surface-2 text-[10px] font-semibold text-indigo-300 border border-line inline-block mt-1">
                                                        {log.taskTitle}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 text-right font-mono font-bold text-ink pr-4">{log.hoursWorked}h</td>
                                            <td className="py-3.5 pr-4">
                                                <div className="w-24 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${log.progressPercent}%` }} />
                                                </div>
                                                <span className="text-[10px] text-ink-soft">{log.progressPercent}%</span>
                                            </td>
                                            <td className="py-3.5 pr-4">
                                                <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${STATUS_STYLES[log.status] || ''}`}>
                                                    {STATUS_LABELS[log.status] || log.status}
                                                </span>
                                                {log.reviewNote && (
                                                    <p className="text-[10px] text-ink-soft mt-1 max-w-[160px]">{log.reviewNote}</p>
                                                )}
                                            </td>
                                            <td className="py-3.5 text-right">
                                                {activeTab === 'team' && log.status === 'pending' && (
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Review note (optional)"
                                                            value={reviewNote[log.id] || ''}
                                                            onChange={(e) => setReviewNote(prev => ({ ...prev, [log.id]: e.target.value }))}
                                                            className="w-40 bg-surface-2 border border-line rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500 text-ink"
                                                        />
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => handleReview(log.id, 'approve')}
                                                                title="Approve"
                                                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReview(log.id, 'requestChanges')}
                                                                title="Request Changes"
                                                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReview(log.id, 'reject')}
                                                                title="Reject"
                                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* SUBMIT WORK LOG MODAL */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="bg-card border border-line w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
                                <NotebookPen className="w-5 h-5 text-indigo-400" />
                                Submit Daily Work Log
                            </h2>
                            <button onClick={() => setShowFormModal(false)} className="text-ink-soft hover:text-ink cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Implemented login flow"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-ink"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Date</label>
                                    <input
                                        type="date"
                                        value={form.logDate}
                                        onChange={(e) => setForm({ ...form, logDate: e.target.value })}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Hours Worked</label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max="24"
                                        placeholder="e.g. 6.5"
                                        value={form.hoursWorked}
                                        onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Start Time</label>
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">End Time</label>
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Project</label>
                                    <select
                                        value={form.projectId}
                                        onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                    >
                                        <option value="">Choose project (Optional)</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Task</label>
                                    <select
                                        value={form.taskId}
                                        onChange={(e) => setForm({ ...form, taskId: e.target.value })}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                    >
                                        <option value="">Choose task (Optional)</option>
                                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Progress: {form.progressPercent}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={form.progressPercent}
                                    onChange={(e) => setForm({ ...form, progressPercent: e.target.value })}
                                    className="w-full cursor-pointer accent-indigo-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">What did you work on?</label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe today's work..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-ink resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Challenges faced (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Any blockers or difficulties?"
                                    value={form.challenges}
                                    onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-ink resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Plan for tomorrow (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="What's next?"
                                    value={form.tomorrowPlan}
                                    onChange={(e) => setForm({ ...form, tomorrowPlan: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-ink resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block flex items-center gap-1.5">
                                    <Github className="w-3.5 h-3.5" /> Git Commit URL (optional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/org/repo/commit/..."
                                    value={form.gitCommitUrl}
                                    onChange={(e) => setForm({ ...form, gitCommitUrl: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-ink"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block flex items-center gap-1.5">
                                    <Paperclip className="w-3.5 h-3.5" /> Attachments / Screenshots (optional)
                                </label>
                                <ImageKitUpload
                                    folder="worklogs"
                                    onUploadSuccess={(file) => setForm(prev => ({ ...prev, attachments: [...prev.attachments, file] }))}
                                />
                                {form.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {form.attachments.map((a, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-surface-2 border border-line text-[10px] text-ink-soft flex items-center gap-1">
                                                {a.fileName}
                                                <button type="button" onClick={() => setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-300 cursor-pointer">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    className="flex-1 py-3.5 bg-surface-2 hover:bg-surface-2 text-xs font-bold rounded-2xl transition cursor-pointer text-ink"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white rounded-2xl hover:shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit for Review'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkLogPage;
