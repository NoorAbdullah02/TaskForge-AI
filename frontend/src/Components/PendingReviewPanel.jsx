import { useState } from 'react';
import { ClipboardCheck, ArrowRight, X, CheckCircle, AlertCircle, Loader, User, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, Badge } from '../design-system/primitives';
import { getTaskDetails } from '../Services/taskApi';
import { approveTask, rejectTask } from '../Services/projectApi';

export default function PendingReviewPanel({ reviewQueue = [], pendingReview = 0, onActionDone }) {
    const [selected, setSelected] = useState(null);   // row from reviewQueue
    const [detail, setDetail] = useState(null);       // full task details (description, etc.)
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [acting, setActing] = useState(false);

    if (!pendingReview && reviewQueue.length === 0) return null;

    const openReview = async (task) => {
        setSelected(task);
        setDetail(null);
        setLoadingDetail(true);
        try {
            const data = await getTaskDetails(task.id);
            setDetail(data);
        } catch {
            // Fall back to the summary row if full details fail to load
            setDetail(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeReview = () => {
        if (acting) return;
        setSelected(null);
        setDetail(null);
    };

    const handleApprove = async () => {
        if (!selected) return;
        setActing(true);
        try {
            await approveTask(selected.id);
            toast.success('Task approved');
            closeReviewForce();
            onActionDone?.();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to approve');
        } finally {
            setActing(false);
        }
    };

    const handleReject = async () => {
        if (!selected) return;
        const reason = window.prompt('Rejection reason:');
        if (reason === null) return;
        setActing(true);
        try {
            await rejectTask(selected.id, reason.trim());
            toast.success('Task rejected');
            closeReviewForce();
            onActionDone?.();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to reject');
        } finally {
            setActing(false);
        }
    };

    // Close without the acting guard (used right after a successful action)
    const closeReviewForce = () => {
        setSelected(null);
        setDetail(null);
    };

    return (
        <>
            <GlassCard padding="p-6" className="mb-7 border border-amber-500/20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-amber-400" />
                            Tasks Awaiting Review
                        </h3>
                        <p className="text-xs text-ink-faint mt-0.5">
                            {pendingReview} task{pendingReview === 1 ? '' : 's'} submitted by your team for approval
                        </p>
                    </div>
                    <Badge status="warning">{pendingReview}</Badge>
                </div>

                <div className="space-y-2">
                    {reviewQueue.slice(0, 8).map((task) => (
                        <button
                            key={task.id}
                            type="button"
                            onClick={() => openReview(task)}
                            className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2 border border-line hover:border-amber-500/30 transition-colors group cursor-pointer"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink truncate">{task.title}</p>
                                <p className="text-[11px] text-ink-faint mt-0.5 truncate">
                                    {task.projectName} · {task.assigneeName}
                                </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-ink-faint group-hover:text-amber-400 shrink-0" />
                        </button>
                    ))}
                </div>
            </GlassCard>

            {/* ─── Review Modal ─── */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-amber-100">
                                    <ClipboardCheck className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-gray-800">Review Task</h3>
                                    <p className="text-xs text-gray-400 font-semibold">Approve or reject the submission</p>
                                </div>
                            </div>
                            <button onClick={closeReview} disabled={acting}
                                className="text-gray-300 hover:text-gray-600 transition p-1 disabled:opacity-40">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Task summary */}
                        <div className="space-y-3">
                            <h4 className="text-xl font-black text-gray-800 leading-tight">{selected.title}</h4>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-bold">
                                    <Briefcase className="w-3.5 h-3.5" /> {selected.projectName}
                                </span>
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-bold">
                                    <User className="w-3.5 h-3.5" /> {selected.assigneeName}
                                </span>
                                {selected.priority && (
                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-bold uppercase">
                                        {selected.priority}
                                    </span>
                                )}
                            </div>

                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                                {loadingDetail ? (
                                    <div className="flex items-center gap-2 text-gray-400 text-sm font-semibold">
                                        <Loader className="w-4 h-4 animate-spin" /> Loading details…
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600 font-medium whitespace-pre-wrap">
                                        {detail?.description || 'No description provided for this task.'}
                                    </p>
                                )}
                            </div>

                            {detail?.subtasks?.length > 0 && (
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                                        Checklist ({detail.subtasks.filter(s => s.isCompleted).length}/{detail.subtasks.length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {detail.subtasks.map(s => (
                                            <div key={s.id} className="flex items-center gap-2 text-sm">
                                                <CheckCircle className={`w-4 h-4 ${s.isCompleted ? 'text-emerald-500' : 'text-gray-300'}`} />
                                                <span className={s.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}>{s.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                            <button onClick={handleApprove} disabled={acting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                                {acting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                            </button>
                            <button onClick={handleReject} disabled={acting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                                {acting ? <Loader className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />} Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
