import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    generateTimesheet, getMyTimesheets, getTeamTimesheets, getTimesheetDetails,
    submitTimesheet, approveTimesheet, rejectTimesheet, setTimesheetLock,
    downloadTimesheetPdf, downloadTimesheetExcel
} from '../Services/timesheetApi';
import {
    CalendarClock, Plus, Loader2, CheckCircle2, XCircle, Lock, Unlock,
    FileText, FileSpreadsheet, Users, X, Send, Clock3
} from 'lucide-react';
import toast from 'react-hot-toast';

const MANAGER_ROLES = ['owner', 'admin', 'manager', 'super_admin'];

const STATUS_STYLES = {
    draft: 'bg-surface-2 text-ink-soft border-line',
    submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABELS = {
    draft: 'Draft',
    submitted: 'Awaiting Review',
    approved: 'Approved',
    rejected: 'Rejected',
};

const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatDecimalHours = (hoursVal) => {
    const totalMinutes = Math.round(Number(hoursVal || 0) * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    const parts = [];
    if (hrs > 0) {
        parts.push(`${hrs} hour${hrs === 1 ? '' : 's'}`);
    }
    if (mins > 0 || parts.length === 0) {
        parts.push(`${mins} minute${mins === 1 ? '' : 's'}`);
    }
    return parts.join(' and ');
};

const formatDurationSeconds = (seconds) => {
    const totalMinutes = Math.round(Number(seconds || 0) / 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    const parts = [];
    if (hrs > 0) {
        parts.push(`${hrs} hour${hrs === 1 ? '' : 's'}`);
    }
    if (mins > 0 || parts.length === 0) {
        parts.push(`${mins} minute${mins === 1 ? '' : 's'}`);
    }
    return parts.join(' and ');
};

const TimesheetPage = () => {
    const { user } = useAuth();
    const isManager = MANAGER_ROLES.includes(user?.role);

    const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'team'
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [mySheets, setMySheets] = useState([]);
    const [teamSheets, setTeamSheets] = useState([]);
    const [reviewNote, setReviewNote] = useState({});
    const [showGenModal, setShowGenModal] = useState(false);
    const [genForm, setGenForm] = useState({ periodType: 'weekly', periodStart: todayStr() });
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const mine = await getMyTimesheets();
            setMySheets(mine || []);

            if (isManager) {
                const team = await getTeamTimesheets();
                setTeamSheets(team || []);
            }
        } catch (error) {
            console.error('Failed to load timesheets:', error);
            toast.error('Could not load timesheet data.');
        } finally {
            setLoading(false);
        }
    }, [isManager]);

    useEffect(() => {
        loadData();
    }, [loadData, user?.activeWorkspaceId]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            setGenerating(true);
            await generateTimesheet(genForm.periodType, genForm.periodStart);
            toast.success('Timesheet generated! 📊');
            setShowGenModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to generate timesheet:', error);
            toast.error(error.response?.data?.message || 'Failed to generate timesheet');
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (id) => {
        try {
            await submitTimesheet(id);
            toast.success('Timesheet submitted for review.');
            loadData();
        } catch (error) {
            console.error('Failed to submit timesheet:', error);
            toast.error(error.response?.data?.message || 'Failed to submit timesheet');
        }
    };

    const handleReview = async (id, action) => {
        const note = reviewNote[id] || '';
        try {
            if (action === 'approve') await approveTimesheet(id, note);
            else await rejectTimesheet(id, note);
            toast.success(`Timesheet ${action === 'approve' ? 'approved and locked' : 'rejected'}.`);
            loadData();
        } catch (error) {
            console.error('Failed to review timesheet:', error);
            toast.error(error.response?.data?.message || 'Review action failed');
        }
    };

    const handleToggleLock = async (sheet) => {
        try {
            await setTimesheetLock(sheet.id, !sheet.isLocked);
            toast.success(sheet.isLocked ? 'Timesheet unlocked.' : 'Timesheet locked.');
            loadData();
        } catch (error) {
            console.error('Failed to toggle lock:', error);
            toast.error('Failed to update lock state');
        }
    };

    const handleDownload = async (id, type, periodStart, periodEnd) => {
        try {
            const blob = type === 'pdf' ? await downloadTimesheetPdf(id) : await downloadTimesheetExcel(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `timesheet-${periodStart}-${periodEnd}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download timesheet');
        }
    };

    const openDetail = async (id) => {
        try {
            setDetailLoading(true);
            setDetail({ id });
            const data = await getTimesheetDetails(id);
            setDetail(data);
        } catch (error) {
            console.error('Failed to load timesheet detail:', error);
            toast.error('Failed to load timesheet detail');
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const pendingTeamSheets = teamSheets.filter(s => s.status === 'submitted');
    const currentList = activeTab === 'team' ? teamSheets : mySheets;

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
                            <CalendarClock className="w-8 h-8 text-indigo-400" />
                            Timesheet
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">
                            Generate daily, weekly, or monthly timesheets from your timer and work log data.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowGenModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white hover:shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Generate Timesheet
                    </button>
                </div>

                {/* Tabs (manager only) */}
                {isManager && (
                    <div className="flex items-center gap-2 mb-8">
                        <button
                            onClick={() => setActiveTab('mine')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'mine' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-surface-2 border border-line text-ink-soft hover:text-ink'}`}
                        >
                            My Timesheets
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeTab === 'team' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-surface-2 border border-line text-ink-soft hover:text-ink'}`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Team Review
                            {pendingTeamSheets.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black">
                                    {pendingTeamSheets.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Main table */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl backdrop-blur-md flex-1">
                    <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Clock3 className="w-4 h-4 text-indigo-400" />
                        {activeTab === 'team' ? 'Team Timesheets' : 'My Timesheets'}
                    </h3>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                            <span className="text-xs">Gathering timesheets...</span>
                        </div>
                    ) : currentList.length === 0 ? (
                        <p className="text-xs text-ink-soft py-10 text-center font-sans">No timesheets found. Generate one to get started.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                <thead>
                                    <tr className="border-b border-line text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                                        <th className="pb-3 pr-4">Period</th>
                                        {activeTab === 'team' && <th className="pb-3 pr-4">Employee</th>}
                                        <th className="pb-3 pr-4">Range</th>
                                        <th className="pb-3 pr-4 text-right">Hours</th>
                                        <th className="pb-3 pr-4 text-right">Logs</th>
                                        <th className="pb-3 pr-4">Status</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {currentList.map(sheet => (
                                        <tr key={sheet.id} className="hover:bg-surface-2 transition-colors align-top">
                                            <td className="py-3.5 font-bold text-ink pr-4">
                                                <button onClick={() => openDetail(sheet.id)} className="hover:text-indigo-400 transition cursor-pointer">
                                                    {PERIOD_LABELS[sheet.periodType] || sheet.periodType}
                                                </button>
                                                {sheet.isLocked && <Lock className="w-3 h-3 inline-block ml-1.5 text-ink-soft" />}
                                            </td>
                                            {activeTab === 'team' && (
                                                <td className="py-3.5 pr-4">
                                                    <div className="font-semibold text-ink">{sheet.employeeName}</div>
                                                    <div className="text-ink-soft text-[10px]">{sheet.employeeEmail}</div>
                                                </td>
                                            )}
                                            <td className="py-3.5 font-mono text-ink-soft pr-4">{sheet.periodStart} → {sheet.periodEnd}</td>
                                            <td className="py-3.5 text-right font-mono font-bold text-ink pr-4">{Number(sheet.totalHours).toFixed(2)}h ({formatDecimalHours(sheet.totalHours)})</td>
                                            <td className="py-3.5 text-right font-mono text-ink-soft pr-4">{sheet.workLogCount}</td>
                                            <td className="py-3.5 pr-4">
                                                <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${STATUS_STYLES[sheet.status] || ''}`}>
                                                    {STATUS_LABELS[sheet.status] || sheet.status}
                                                </span>
                                                {sheet.reviewNote && (
                                                    <p className="text-[10px] text-ink-soft mt-1 max-w-[160px]">{sheet.reviewNote}</p>
                                                )}
                                            </td>
                                            <td className="py-3.5 text-right">
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleDownload(sheet.id, 'pdf', sheet.periodStart, sheet.periodEnd)}
                                                            title="Download PDF"
                                                            className="p-1.5 rounded-lg bg-surface-2 text-ink-soft border border-line hover:text-ink transition cursor-pointer"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(sheet.id, 'excel', sheet.periodStart, sheet.periodEnd)}
                                                            title="Download Excel"
                                                            className="p-1.5 rounded-lg bg-surface-2 text-ink-soft border border-line hover:text-ink transition cursor-pointer"
                                                        >
                                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                                        </button>

                                                        {activeTab === 'mine' && (sheet.status === 'draft' || sheet.status === 'rejected') && !sheet.isLocked && (
                                                            <button
                                                                onClick={() => handleSubmit(sheet.id)}
                                                                title="Submit for review"
                                                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                                                            >
                                                                <Send className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {activeTab === 'team' && (
                                                            <button
                                                                onClick={() => handleToggleLock(sheet)}
                                                                title={sheet.isLocked ? 'Unlock' : 'Lock'}
                                                                className="p-1.5 rounded-lg bg-surface-2 text-ink-soft border border-line hover:text-ink transition cursor-pointer"
                                                            >
                                                                {sheet.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {activeTab === 'team' && sheet.status === 'submitted' && (
                                                        <>
                                                            <input
                                                                type="text"
                                                                placeholder="Review note (optional)"
                                                                value={reviewNote[sheet.id] || ''}
                                                                onChange={(e) => setReviewNote(prev => ({ ...prev, [sheet.id]: e.target.value }))}
                                                                className="w-40 bg-surface-2 border border-line rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500 text-ink"
                                                            />
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => handleReview(sheet.id, 'approve')}
                                                                    title="Approve & lock"
                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReview(sheet.id, 'reject')}
                                                                    title="Reject"
                                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* GENERATE TIMESHEET MODAL */}
            {showGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="bg-card border border-line w-full max-w-md rounded-3xl p-6 shadow-2xl relative my-8">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
                                <CalendarClock className="w-5 h-5 text-indigo-400" />
                                Generate Timesheet
                            </h2>
                            <button onClick={() => setShowGenModal(false)} className="text-ink-soft hover:text-ink cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Period Type</label>
                                <select
                                    value={genForm.periodType}
                                    onChange={(e) => setGenForm({ ...genForm, periodType: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Anchor Date</label>
                                <input
                                    type="date"
                                    value={genForm.periodStart}
                                    onChange={(e) => setGenForm({ ...genForm, periodStart: e.target.value })}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 text-ink"
                                />
                                <p className="text-[10px] text-ink-soft">The period containing this date will be generated (e.g. the full week or month).</p>
                            </div>

                            <div className="flex gap-3 mt-6 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowGenModal(false)}
                                    className="flex-1 py-3.5 bg-surface-2 hover:bg-surface-2 text-xs font-bold rounded-2xl transition cursor-pointer text-ink"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white rounded-2xl hover:shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="bg-card border border-line w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
                                <Clock3 className="w-5 h-5 text-indigo-400" />
                                Timesheet Breakdown
                            </h2>
                            <button onClick={() => setDetail(null)} className="text-ink-soft hover:text-ink cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {detailLoading || !detail.periodType ? (
                            <div className="flex flex-col items-center justify-center py-16 text-ink-soft">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-surface-2 border border-line p-4 rounded-2xl">
                                        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Range</span>
                                        <span className="text-xs font-extrabold text-ink mt-0.5 block">{detail.periodStart} → {detail.periodEnd}</span>
                                    </div>
                                    <div className="bg-surface-2 border border-line p-4 rounded-2xl">
                                        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Total Hours</span>
                                        <span className="text-xs font-extrabold text-ink mt-0.5 block">{Number(detail.totalHours).toFixed(2)}h ({formatDecimalHours(detail.totalHours)})</span>
                                    </div>
                                    <div className="bg-surface-2 border border-line p-4 rounded-2xl">
                                        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Status</span>
                                        <span className={`text-[10px] font-extrabold uppercase mt-0.5 block px-2 py-0.5 rounded border inline-block w-fit ${STATUS_STYLES[detail.status] || ''}`}>
                                            {STATUS_LABELS[detail.status] || detail.status}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest mb-2">Time Entries</h3>
                                    {(!detail.timeEntries || detail.timeEntries.length === 0) ? (
                                        <p className="text-xs text-ink-soft">No time entries.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {detail.timeEntries.map(t => (
                                                <div key={t.id} className="flex justify-between text-xs bg-surface-2 border border-line rounded-xl px-3 py-2">
                                                    <span className="text-ink-soft">{new Date(t.startTime).toLocaleString()} — {t.taskTitle || 'No task'}</span>
                                                    <span className="font-bold text-ink">{t.duration ? `${Math.round((t.duration / 3600) * 100) / 100}h (${formatDurationSeconds(t.duration)})` : '0 minutes'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest mb-2">Daily Work Logs</h3>
                                    {(!detail.workLogEntries || detail.workLogEntries.length === 0) ? (
                                        <p className="text-xs text-ink-soft">No work logs.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {detail.workLogEntries.map(l => (
                                                <div key={l.id} className="flex justify-between text-xs bg-surface-2 border border-line rounded-xl px-3 py-2">
                                                    <span className="text-ink-soft">{l.logDate} — {l.title}</span>
                                                    <span className="font-bold text-ink">{l.hoursWorked}h · {l.progressPercent}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimesheetPage;
