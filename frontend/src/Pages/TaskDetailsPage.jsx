import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageKitUpload from '../Components/ImageKitUpload';
import {
    getTaskDetails, updateTask, deleteTask,
    createSubtask, updateSubtask, deleteSubtask,
    createComment, deleteComment,
    createAttachment, deleteAttachment,
    lockTask, unlockTask, watchTask, unwatchTask,
    archiveTask, restoreTask, duplicateTask,
    startTimer, stopTimer, startPomodoro, stopPomodoro,
    undoChange, redoChange, getTaskAIScores,
} from '../Services/taskApi';
import {
    recommendAssignee, getTaskHealth, getProjectDependencies, addDependency, deleteDependency
} from '../Services/intelligenceApi';
import { getProjectDetails, approveTask, rejectTask } from '../Services/projectApi';
import { socket } from '../Services/socket';
import { predictDeadline } from '../Services/aiApi';
import TaskModal from '../Components/TaskModal';

import {
    Loader, Calendar, ArrowLeft, CheckSquare, AlertCircle, User, Trophy, Trash2,
    MessageSquare, Paperclip, Plus, CheckCircle, Circle, Download, Eye, Edit2, Brain,
    ShieldAlert, ChevronRight, Sparkles, Lock, Unlock, Clock, Play, Pause, Square,
    RotateCcw, RotateCw, Archive, Copy, RefreshCw, Eye as EyeIcon, EyeOff,
    Activity, BarChart2, History, Zap, Star, Tag, Users, ChevronDown, X,
    Timer, TrendingUp, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtSeconds = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const PRIORITY_COLORS = {
    low:      'bg-gray-100 text-gray-700',
    medium:   'bg-blue-100 text-blue-800',
    high:     'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
};

const STATUS_COLORS_BADGE = {
    backlog:     'bg-gray-100 text-gray-600',
    todo:        'bg-blue-100 text-blue-700',
    'in-progress':'bg-amber-100 text-amber-800',
    review:      'bg-purple-100 text-purple-700',
    done:        'bg-emerald-100 text-emerald-700',
};

// ─── Timer Widget ──────────────────────────────────────────────────────────
const TimerWidget = ({ task, onRefresh }) => {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        // If task has an active timer, compute elapsed from timerStart
        if (task?.isTimerActive && task?.timerStart) {
            const startMs = new Date(task.timerStart).getTime();
            const base = task.timerElapsed || 0;
            setElapsed(base + Math.floor((Date.now() - startMs) / 1000));
            setRunning(true);
            intervalRef.current = setInterval(() => {
                setElapsed(base + Math.floor((Date.now() - startMs) / 1000));
            }, 1000);
        } else {
            setElapsed(task?.timerElapsed || 0);
            setRunning(false);
        }
        return () => clearInterval(intervalRef.current);
    }, [task?.isTimerActive, task?.timerStart, task?.timerElapsed]);

    const handleStart = async () => {
        setLoading(true);
        try {
            await startTimer(task.id);
            toast.success('Timer started');
            onRefresh();
        } catch { toast.error('Failed to start timer'); }
        finally { setLoading(false); }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await stopTimer(task.id);
            toast.success('Timer stopped');
            onRefresh();
        } catch { toast.error('Failed to stop timer'); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5 opacity-90">
                    <Timer className="w-4 h-4" /> Time Tracker
                </h4>
                {running && <span className="flex items-center gap-1 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full animate-pulse"><span className="w-1.5 h-1.5 bg-green-300 rounded-full"></span> Live</span>}
            </div>
            <div className="text-4xl font-black tracking-wider text-center my-3 font-mono">
                {fmtSeconds(elapsed)}
            </div>
            {task.estimatedHours && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs font-semibold opacity-75 mb-1">
                        <span>Progress</span>
                        <span>{Math.min(100, Math.round((elapsed / 3600) / task.estimatedHours * 100))}%</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white/80 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (elapsed / 3600) / task.estimatedHours * 100)}%` }}
                        />
                    </div>
                </div>
            )}
            <div className="flex gap-2 justify-center">
                {!running ? (
                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-white text-blue-700 font-black rounded-xl text-sm hover:bg-blue-50 transition disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" /> Start
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-red-400 hover:bg-red-300 text-white font-black rounded-xl text-sm transition disabled:opacity-50"
                    >
                        <Square className="w-4 h-4" /> Stop
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Pomodoro Widget ───────────────────────────────────────────────────────
const POMODORO_DURATION = 25 * 60; // 25 min default

const PomodoroWidget = ({ task, onRefresh }) => {
    const [remaining, setRemaining] = useState(POMODORO_DURATION);
    const [active, setActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cycles, setCycles] = useState(task?.pomodoroCount || 0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (task?.isPomodoroActive && task?.pomodoroStart) {
            const startMs = new Date(task.pomodoroStart).getTime();
            const elapsed = Math.floor((Date.now() - startMs) / 1000);
            const left = Math.max(0, POMODORO_DURATION - elapsed);
            setRemaining(left);
            setActive(left > 0);
            setCycles(task.pomodoroCount || 0);

            if (left > 0) {
                intervalRef.current = setInterval(() => {
                    const now = Math.floor((Date.now() - startMs) / 1000);
                    const newLeft = Math.max(0, POMODORO_DURATION - now);
                    setRemaining(newLeft);
                    if (newLeft === 0) {
                        clearInterval(intervalRef.current);
                        setActive(false);
                        toast.success('🍅 Pomodoro complete!');
                        onRefresh();
                    }
                }, 1000);
            }
        } else {
            setRemaining(POMODORO_DURATION);
            setActive(false);
            setCycles(task?.pomodoroCount || 0);
        }
        return () => clearInterval(intervalRef.current);
    }, [task?.isPomodoroActive, task?.pomodoroStart, task?.pomodoroCount]);

    const pct = ((POMODORO_DURATION - remaining) / POMODORO_DURATION) * 100;
    const radius = 40;
    const circ = 2 * Math.PI * radius;

    const handleStart = async () => {
        setLoading(true);
        try {
            await startPomodoro(task.id);
            toast.success('🍅 Pomodoro started — 25 min focus!');
            onRefresh();
        } catch { toast.error('Failed to start Pomodoro'); }
        finally { setLoading(false); }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await stopPomodoro(task.id);
            toast('Pomodoro stopped');
            onRefresh();
        } catch { toast.error('Failed to stop Pomodoro'); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5 opacity-90">
                    🍅 Pomodoro Timer
                </h4>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {cycles} cycles
                </span>
            </div>

            {/* Circular progress */}
            <div className="flex justify-center my-3 relative">
                <svg width="100" height="100" className="-rotate-90">
                    <circle cx="50" cy="50" r={radius} strokeWidth="6" stroke="rgba(255,255,255,0.2)" fill="none" />
                    <circle
                        cx="50" cy="50" r={radius} strokeWidth="6"
                        stroke="white" fill="none"
                        strokeDasharray={circ}
                        strokeDashoffset={circ - (pct / 100) * circ}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black font-mono">{fmtSeconds(remaining)}</span>
                </div>
            </div>

            <div className="flex gap-2 justify-center">
                {!active ? (
                    <button onClick={handleStart} disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-white text-rose-600 font-black rounded-xl text-sm hover:bg-rose-50 transition disabled:opacity-50">
                        <Play className="w-4 h-4" /> Start Focus
                    </button>
                ) : (
                    <button onClick={handleStop} disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-white/20 hover:bg-white/30 text-white font-black rounded-xl text-sm transition disabled:opacity-50">
                        <Square className="w-4 h-4" /> Stop
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── AI Score Panel ────────────────────────────────────────────────────────
const AIScorePanel = ({ taskId }) => {
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getTaskAIScores(taskId);
            setScores(data);
        } catch { toast.error('Failed to load AI scores'); }
        finally { setLoading(false); }
    };

    const scoreBar = (label, value, max = 100, color = 'bg-blue-500') => (
        <div key={label}>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                <span>{label}</span>
                <span className={`font-black ${value > 70 ? 'text-red-600' : value > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {value ?? '—'}{max === 100 ? '/100' : ''}
                </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${Math.min(100, value || 0)}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl p-5 shadow border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-gray-800 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" /> AI Intelligence
                </h4>
                <button
                    onClick={load}
                    disabled={loading}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 transition flex items-center gap-1 disabled:opacity-50"
                >
                    {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {scores ? 'Refresh' : 'Load Scores'}
                </button>
            </div>

            {!scores && !loading && (
                <p className="text-xs text-gray-400 font-medium text-center py-3">
                    Click "Load Scores" to get AI-powered risk and health analysis.
                </p>
            )}

            {scores && (
                <div className="space-y-3">
                    {scoreBar('AI Confidence Score', scores.aiScore, 100, 'bg-purple-500')}
                    {scoreBar('Risk Score',           scores.riskScore, 100,
                        scores.riskScore > 70 ? 'bg-red-500' : scores.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    {scores.completionPrediction != null && (
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                            <p className="text-xs font-bold text-purple-700 mb-0.5">Completion Prediction</p>
                            <p className="text-sm font-black text-gray-800">
                                {new Date(scores.completionPrediction).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    )}
                    {scores.delayPrediction != null && (
                        <div className={`p-3 rounded-xl border ${scores.delayPrediction > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <p className={`text-xs font-bold ${scores.delayPrediction > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                {scores.delayPrediction > 0 ? `⚠️ ${scores.delayPrediction}d delay predicted` : '✅ On track — no delay predicted'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Watchers Panel ────────────────────────────────────────────────────────
const WatchersPanel = ({ task, user, onRefresh }) => {
    const isWatching = task.watchers?.some(w => w.userId === user?.id);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        setLoading(true);
        try {
            if (isWatching) {
                await unwatchTask(task.id);
                toast.success('Unwatched task');
            } else {
                await watchTask(task.id);
                toast.success('Now watching task');
            }
            onRefresh();
        } catch { toast.error('Failed to update watcher status'); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-gray-800 flex items-center gap-2 text-sm">
                    <EyeIcon className="w-4.5 h-4.5 text-blue-500" /> Watchers
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-black">
                        {task.watchers?.length || 0}
                    </span>
                </h4>
                <button
                    onClick={toggle}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isWatching
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50`}
                >
                    {loading ? <Loader className="w-3 h-3 animate-spin" /> : (isWatching ? <EyeIcon className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />)}
                    {isWatching ? 'Unwatch' : 'Watch'}
                </button>
            </div>

            {(task.watchers?.length || 0) === 0 ? (
                <p className="text-xs text-gray-400 font-medium">No one is watching this task yet.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {task.watchers.map(w => (
                        <div key={w.userId} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-2 py-1">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                                {w.userName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{w.userName}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── History Timeline ──────────────────────────────────────────────────────
const HistoryTimeline = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm font-medium">
                No history recorded yet.
            </div>
        );
    }

    const actionIcon = (action) => {
        switch (action) {
            case 'create':     return <span className="text-emerald-500 text-xs">✦</span>;
            case 'update':     return <span className="text-blue-500 text-xs">✎</span>;
            case 'delete':     return <span className="text-red-500 text-xs">✕</span>;
            case 'lock':       return <Lock className="w-3 h-3 text-red-500" />;
            case 'unlock':     return <Unlock className="w-3 h-3 text-green-500" />;
            case 'archive':    return <Archive className="w-3 h-3 text-amber-500" />;
            case 'restore':    return <RefreshCw className="w-3 h-3 text-teal-500" />;
            case 'timer_start':return <Play className="w-3 h-3 text-blue-400" />;
            case 'timer_stop': return <Square className="w-3 h-3 text-gray-500" />;
            default:           return <Activity className="w-3 h-3 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {history.slice().reverse().map((h, i) => (
                <div key={h.id || i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                        {actionIcon(h.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-800 text-xs capitalize">{h.action}</span>
                            {h.field && (
                                <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1.5 py-0.5 font-bold">{h.field}</span>
                            )}
                        </div>
                        {(h.oldValue || h.newValue) && (
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                                {h.oldValue && <span className="line-through text-red-400 mr-1">{h.oldValue}</span>}
                                {h.newValue && <span className="text-emerald-600 font-bold">{h.newValue}</span>}
                            </p>
                        )}
                        <p className="text-[10px] text-gray-400 font-semibold mt-1">
                            {h.userName && <span className="text-gray-600 font-bold">{h.userName} · </span>}
                            {new Date(h.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Lock Control ──────────────────────────────────────────────────────────
const LockControl = ({ task, isPM, onRefresh }) => {
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        setLoading(true);
        try {
            if (task.isLocked) {
                await unlockTask(task.id);
                toast.success('Task unlocked');
            } else {
                await lockTask(task.id);
                toast.success('Task locked — edit protection enabled');
            }
            onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to toggle lock');
        } finally { setLoading(false); }
    };

    return (
        <button
            onClick={toggle}
            disabled={loading || !isPM}
            title={isPM ? (task.isLocked ? 'Unlock Task' : 'Lock Task') : 'Only PMs can lock/unlock'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                task.isLocked
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : task.isLocked ? (
                <Lock className="w-3.5 h-3.5" />
            ) : (
                <Unlock className="w-3.5 h-3.5" />
            )}
            {task.isLocked ? 'Locked' : 'Unlocked'}
        </button>
    );
};

// ─── Main Page Component ───────────────────────────────────────────────────
const TaskDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, loading: authLoading } = useAuth();

    const [task, setTask]           = useState(null);
    const [project, setProject]     = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [addingSubtask, setAddingSubtask]     = useState(false);
    const [newComment, setNewComment]           = useState('');
    const [postingComment, setPostingComment]   = useState(false);
    const [addingAttachment, setAddingAttachment] = useState(false);

    // Edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Intelligence
    const [health, setHealth]             = useState(null);
    const [dependencies, setDependencies] = useState([]);
    const [projectTasks, setProjectTasks] = useState([]);
    const [recommendations, setRecommendations] = useState(null);
    const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
    const [recommending, setRecommending] = useState(false);
    const [deadlinePrediction, setDeadlinePrediction] = useState(null);

    // Dependency form
    const [depParentId, setDepParentId] = useState('');
    const [depType, setDepType]         = useState('FS');
    const [linkingDep, setLinkingDep]   = useState(false);

    // Active panel on the right sidebar
    const [rightPanel, setRightPanel] = useState('info'); // 'info' | 'timer' | 'history' | 'ai'

    useEffect(() => {
        if (!authLoading && !isLoggedIn) navigate('/login');
    }, [isLoggedIn, authLoading, navigate]);

    const fetchHealthAndDependencies = async (projectId) => {
        try {
            const [healthData, depsData, projDetails] = await Promise.all([
                getTaskHealth(id),
                getProjectDependencies(projectId),
                getProjectDetails(projectId),
            ]);
            setHealth(healthData);
            setDependencies(depsData.dependencies || []);
            setProject(projDetails);
            setProjectTasks(projDetails.tasks || []);
        } catch (err) {
            console.error('Error loading health/deps:', err);
        }
    };

    const fetchDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getTaskDetails(id);
            setTask(data);
            if (data?.projectId) await fetchHealthAndDependencies(data.projectId);
            try {
                const dl = await predictDeadline('task', id);
                setDeadlinePrediction(dl);
            } catch {}
        } catch (err) {
            toast.error('Failed to load task details');
            navigate('/tasks');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isLoggedIn && id) fetchDetails();
    }, [isLoggedIn, id, fetchDetails]);

    useEffect(() => {
        if (!isLoggedIn || !id) return;
        const handleTaskUpdated = (data) => {
            if (parseInt(data.taskId) === parseInt(id)) {
                if (data.action === 'deleted') { toast.error('Task deleted'); navigate('/tasks'); }
                else fetchDetails();
            }
        };
        socket.on('task_updated', handleTaskUpdated);
        return () => socket.off('task_updated', handleTaskUpdated);
    }, [isLoggedIn, id]);

    // ─── Permissions ───────────────────────────────────────────────────────
    const currentMember = project?.members?.find(m => m.id === user?.id);
    const isOwner = project?.members?.find(m => m.id === user?.id && m.role === 'owner') || user?.role === 'owner' || user?.role === 'super_admin';
    const isPM    = (project && (currentMember?.role === 'manager' || isOwner)) || user?.role === 'super_admin' || user?.role === 'owner';
    const isAssignee = task?.assigneeId === user?.id;

    // ─── Handlers ──────────────────────────────────────────────────────────
    const handleStatusChange = async (newStatus) => {
        try { await updateTask(id, { status: newStatus }); toast.success('Status updated'); fetchDetails(); }
        catch { toast.error('Failed to update status'); }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm('Permanently delete this task?')) return;
        try { await deleteTask(id); toast.success('Task deleted'); navigate('/tasks'); }
        catch { toast.error('Failed to delete task'); }
    };

    const handleApproveTask = async () => {
        try { await approveTask(id); toast.success('Task approved'); fetchDetails(); }
        catch (e) { toast.error(e?.response?.data?.message || 'Failed to approve'); }
    };

    const handleRejectTask = async () => {
        const reason = window.prompt('Rejection reason:');
        if (reason === null) return;
        try { await rejectTask(id, reason.trim()); toast.success('Task rejected'); fetchDetails(); }
        catch (e) { toast.error(e?.response?.data?.message || 'Failed to reject'); }
    };

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        try {
            setAddingSubtask(true);
            await createSubtask(id, newSubtaskTitle.trim());
            toast.success('Subtask added');
            setNewSubtaskTitle('');
            fetchDetails();
        } catch { toast.error('Failed to add subtask'); }
        finally { setAddingSubtask(false); }
    };

    const handleToggleSubtask = async (subtaskId, isCompleted) => {
        try { await updateSubtask(id, subtaskId, { isCompleted: !isCompleted }); fetchDetails(); }
        catch { toast.error('Failed to update subtask'); }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        try { await deleteSubtask(id, subtaskId); fetchDetails(); }
        catch { toast.error('Failed to delete subtask'); }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            setPostingComment(true);
            await createComment(id, newComment.trim());
            setNewComment('');
            fetchDetails();
        } catch { toast.error('Failed to post comment'); }
        finally { setPostingComment(false); }
    };

    const handleDeleteComment = async (cId) => {
        try { await deleteComment(id, cId); fetchDetails(); }
        catch { toast.error('Failed to delete comment'); }
    };

    const handleDeleteAttachment = async (aId) => {
        try { await deleteAttachment(id, aId); fetchDetails(); }
        catch { toast.error('Failed to delete attachment'); }
    };

    const handleRecommendAssignee = async () => {
        try {
            setRecommending(true);
            const data = await recommendAssignee(id);
            setRecommendations(data);
            setIsRecommenderOpen(true);
        } catch { toast.error('AI recommendation failed'); }
        finally { setRecommending(false); }
    };

    const handleAssignMember = async (userId) => {
        try { await updateTask(id, { assigneeId: userId }); toast.success('Assignee updated'); setIsRecommenderOpen(false); fetchDetails(); }
        catch { toast.error('Failed to update assignee'); }
    };

    const handleAddDependency = async (e) => {
        e.preventDefault();
        if (!depParentId) return;
        if (Number(depParentId) === Number(id)) { toast.error('A task cannot depend on itself'); return; }
        try {
            setLinkingDep(true);
            await addDependency(Number(id), Number(depParentId), depType);
            toast.success('Dependency linked');
            setDepParentId('');
            fetchDetails();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to link dependency'); }
        finally { setLinkingDep(false); }
    };

    const handleDeleteDependency = async (depId) => {
        try { await deleteDependency(depId); toast.success('Dependency removed'); fetchDetails(); }
        catch { toast.error('Failed to delete dependency'); }
    };

    const handleDuplicate = async () => {
        try { await duplicateTask(id); toast.success('Task duplicated'); fetchDetails(); }
        catch { toast.error('Failed to duplicate task'); }
    };

    const handleArchiveToggle = async () => {
        try {
            if (task.isArchived) { await restoreTask(id); toast.success('Task restored'); }
            else { await archiveTask(id); toast.success('Task archived'); }
            fetchDetails();
        } catch { toast.error('Failed to toggle archive'); }
    };

    const handleUndo = async () => {
        try { await undoChange(id); toast.success('Change undone'); fetchDetails(); }
        catch (e) { toast.error(e?.response?.data?.error || 'Nothing to undo'); }
    };

    const handleRedo = async () => {
        try { await redoChange(id); toast.success('Change redone'); fetchDetails(); }
        catch (e) { toast.error(e?.response?.data?.error || 'Nothing to redo'); }
    };

    // ─── Loading state ─────────────────────────────────────────────────────
    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading task details...</p>
                </div>
            </div>
        );
    }

    const taskDeps = dependencies.filter(d => d.taskId === Number(id) || d.dependsOnTaskId === Number(id));
    const subtaskPct = task.subtasks?.length > 0
        ? Math.round(task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length * 100)
        : 0;

    const RIGHT_TABS = [
        { key: 'info',    label: 'Info',    icon: Shield },
        { key: 'timer',   label: 'Timer',   icon: Timer },
        { key: 'history', label: 'History', icon: History },
        { key: 'ai',      label: 'AI',      icon: Brain },
    ];

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* ─── Breadcrumb ─── */}
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => navigate('/tasks')} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 font-bold transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Tasks
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-400 font-semibold text-sm truncate max-w-xs">{task.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ═══════════════════════════════════════════════════════
                         LEFT COLUMN — Main content
                    ════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* ─── Task Header Card ─── */}
                        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            {/* Status badges row */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${PRIORITY_COLORS[task.priority]}`}>
                                    {task.priority} Priority
                                </span>
                                {health && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                                        health.color === 'Green'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        health.color === 'Yellow' ? 'bg-amber-50   text-amber-700   border-amber-200' :
                                                                    'bg-red-50     text-red-700     border-red-200 animate-pulse'
                                    }`}>
                                        Health: {health.score} ({health.color})
                                    </span>
                                )}
                                {task.isMilestone && (
                                    <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                        <Trophy className="w-4 h-4" /> Milestone
                                    </span>
                                )}
                                {task.isRecurring && (
                                    <span className="flex items-center gap-1 bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                        <RefreshCw className="w-3.5 h-3.5" /> Recurring
                                    </span>
                                )}
                                {task.isArchived && (
                                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                        <Archive className="w-3.5 h-3.5" /> Archived
                                    </span>
                                )}
                                {deadlinePrediction && (
                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        AI: {new Date(deadlinePrediction.predicted_date).toLocaleDateString()} ({Math.round(deadlinePrediction.confidence_score * 100)}%)
                                    </span>
                                )}
                            </div>

                            {/* Title + Project */}
                            <h1 className="text-3xl font-extrabold text-gray-800 mb-1 leading-tight">{task.title}</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-bold uppercase">Project:</span>
                                <Link to={`/projects/${task.projectId}`} className="text-sm font-extrabold text-blue-600 hover:underline">
                                    {task.project?.name}
                                </Link>
                            </div>

                            {/* Labels & Category */}
                            {(task.labels || task.category) && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {task.category && (
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold">
                                            📁 {task.category}
                                        </span>
                                    )}
                                    {task.labels?.split(',').map(l => l.trim()).filter(Boolean).map(label => (
                                        <span key={label} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">
                                            #{label}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-gray-100">
                                {isPM && task.status === 'review' && (
                                    <>
                                        <button onClick={handleApproveTask}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-sm">
                                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                                        </button>
                                        <button onClick={handleRejectTask}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-sm">
                                            <AlertCircle className="w-3.5 h-3.5" /> Reject
                                        </button>
                                    </>
                                )}
                                {isPM && <LockControl task={task} isPM={isPM} onRefresh={fetchDetails} />}
                                {isPM && (
                                    <button onClick={handleArchiveToggle}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl text-xs font-bold transition border border-amber-200">
                                        <Archive className="w-3.5 h-3.5" /> {task.isArchived ? 'Restore' : 'Archive'}
                                    </button>
                                )}
                                <button onClick={handleDuplicate}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition border border-gray-200">
                                    <Copy className="w-3.5 h-3.5" /> Duplicate
                                </button>
                                <button onClick={handleUndo}
                                    title="Undo last change"
                                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-bold transition border border-gray-200">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={handleRedo}
                                    title="Redo"
                                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-bold transition border border-gray-200">
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                                {isPM && (
                                    <>
                                        <button onClick={() => setIsEditModalOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition border border-blue-200 ml-auto">
                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button onClick={handleDeleteTask}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition border border-red-200">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ─── Description ─── */}
                        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-3">Description</h3>
                            <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                                {task.description || 'No description provided for this task.'}
                            </p>
                        </div>

                        {/* ─── Checklist / Subtasks ─── */}
                        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-blue-500" /> Checklist
                                </h3>
                                {task.subtasks?.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${subtaskPct}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">{subtaskPct}%</span>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAddSubtask} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubtaskTitle}
                                    onChange={e => setNewSubtaskTitle(e.target.value)}
                                    placeholder="Add subtask..."
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-400"
                                />
                                <button type="submit" disabled={addingSubtask || !newSubtaskTitle.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                                    Add
                                </button>
                            </form>

                            {task.subtasks?.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-3 font-semibold">No subtasks yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {task.subtasks.map(sub => (
                                        <div key={sub.id}
                                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${sub.isCompleted ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <button type="button" onClick={() => handleToggleSubtask(sub.id, sub.isCompleted)}
                                                    className={`p-1 rounded-full transition ${sub.isCompleted ? 'text-emerald-600' : 'text-gray-300 hover:text-blue-500'}`}>
                                                    {sub.isCompleted ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                </button>
                                                <span className={`font-semibold text-sm ${sub.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                    {sub.title}
                                                </span>
                                            </div>
                                            <button onClick={() => handleDeleteSubtask(sub.id)}
                                                className="text-gray-300 hover:text-red-500 transition p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ─── Comments ─── */}
                        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 space-y-5">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-500" /> Comments
                                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-black ml-1">{task.comments?.length || 0}</span>
                            </h3>

                            <div className="space-y-3">
                                {task.comments?.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-3 font-semibold">No comments yet.</p>
                                ) : (
                                    task.comments.map(com => (
                                        <div key={com.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 group relative">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-indigo-600 text-white text-xs font-black rounded-full flex items-center justify-center">
                                                    {com.userName?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-extrabold text-xs text-gray-700">{com.userName}</span>
                                                <span className="text-[10px] text-gray-400 font-semibold">{new Date(com.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 font-medium whitespace-pre-wrap pl-9">{com.content}</p>
                                            {com.userId === user?.id && (
                                                <button onClick={() => handleDeleteComment(com.id)}
                                                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleAddComment} className="space-y-3">
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-400 resize-none"
                                    required
                                />
                                <div className="flex justify-end">
                                    <button type="submit" disabled={postingComment || !newComment.trim()}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 shadow">
                                        Post Comment
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ─── Attachments ─── */}
                        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 space-y-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Paperclip className="w-5 h-5 text-gray-500" /> Attachments
                            </h3>

                            {task.attachments?.length === 0 ? (
                                <p className="text-gray-400 text-xs font-semibold">No files attached.</p>
                            ) : (
                                <div className="space-y-2">
                                    {task.attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                                                    className="font-bold text-xs text-blue-600 hover:underline truncate">
                                                    {att.fileName}
                                                </a>
                                            </div>
                                            <button onClick={() => handleDeleteAttachment(att.id)}
                                                className="text-gray-300 hover:text-red-500 transition p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs font-extrabold text-gray-400 uppercase mb-2">Upload File</p>
                                <ImageKitUpload folder="attachments" onUploadSuccess={async (fileDetails) => {
                                    try {
                                        setAddingAttachment(true);
                                        await createAttachment(id, { fileName: fileDetails.fileName, fileUrl: fileDetails.fileUrl, fileType: fileDetails.fileType });
                                        toast.success('File attached');
                                        fetchDetails();
                                    } catch { toast.error('Failed to save attachment'); }
                                    finally { setAddingAttachment(false); }
                                }} />
                            </div>
                        </div>

                        {/* ─── Dependencies ─── */}
                        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 space-y-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-amber-500" /> Dependencies
                            </h3>

                            <div className="space-y-2">
                                {taskDeps.length === 0 ? (
                                    <p className="text-gray-400 text-xs font-semibold">No dependencies linked.</p>
                                ) : (
                                    taskDeps.map(dep => {
                                        const isPredecessor = dep.taskId === Number(id);
                                        const linkedTaskId = isPredecessor ? dep.dependsOnTaskId : dep.taskId;
                                        const linkedTask = projectTasks.find(t => t.id === linkedTaskId);
                                        return (
                                            <div key={dep.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-400">
                                                        {isPredecessor ? 'Depends on →' : '← Pre-req for'}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 font-bold text-[9px] rounded">{dep.dependencyType}</span>
                                                        <Link to={`/tasks/${linkedTaskId}`}
                                                            className="text-xs font-bold text-blue-600 hover:underline truncate max-w-[180px]">
                                                            {linkedTask?.title || `Task #${linkedTaskId}`}
                                                        </Link>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteDependency(dep.id)}
                                                    className="text-gray-300 hover:text-red-500 transition p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <form onSubmit={handleAddDependency} className="space-y-2 pt-2 border-t border-gray-100">
                                <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Link Dependency</p>
                                <select value={depParentId} onChange={e => setDepParentId(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-blue-400">
                                    <option value="">Select predecessor task...</option>
                                    {projectTasks.filter(t => t.id !== Number(id)).map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <select value={depType} onChange={e => setDepType(e.target.value)}
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-blue-400">
                                        <option value="FS">Finish-to-Start (FS)</option>
                                        <option value="SS">Start-to-Start (SS)</option>
                                        <option value="FF">Finish-to-Finish (FF)</option>
                                        <option value="SF">Start-to-Finish (SF)</option>
                                    </select>
                                    <button type="submit" disabled={linkingDep || !depParentId}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50">
                                        Link
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                         RIGHT COLUMN — Side panels
                    ════════════════════════════════════════════════════════ */}
                    <div className="space-y-5">
                        {/* Tab switcher */}
                        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                            <div className="flex border-b border-gray-100">
                                {RIGHT_TABS.map(({ key, label, icon: Icon }) => (
                                    <button key={key}
                                        onClick={() => setRightPanel(key)}
                                        className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-extrabold uppercase tracking-wider transition ${
                                            rightPanel === key
                                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                                                : 'text-gray-400 hover:text-gray-600'
                                        }`}>
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-5">
                                {/* ─── Info Panel ─── */}
                                {rightPanel === 'info' && (
                                    <div className="space-y-5">
                                        {/* Status */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                                            <select
                                                value={task.status}
                                                onChange={e => handleStatusChange(e.target.value)}
                                                disabled={task.isLocked || (!isPM && (task.assigneeId !== user?.id || task.status === 'review' || task.status === 'done'))}
                                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <option value="backlog">Backlog</option>
                                                <option value="todo">To Do</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="review">In Review</option>
                                                <option value="done">Completed</option>
                                            </select>
                                            {task.isLocked && <p className="text-[10px] text-red-500 font-bold mt-1">🔒 Task is locked — contact PM to unlock</p>}
                                        </div>

                                        {/* Assignee */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assignee</label>
                                                <button onClick={handleRecommendAssignee} disabled={recommending}
                                                    className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition disabled:opacity-50">
                                                    {recommending ? <Loader className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                                                    AI Recommend
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="w-8 h-8 bg-indigo-600 text-white text-sm font-black rounded-full flex items-center justify-center">
                                                    {task.assignee ? task.assignee.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-sm text-gray-800">{task.assignee?.name || 'Unassigned'}</p>
                                                    <p className="text-[10px] text-gray-400 font-semibold">{task.assignee?.email || 'No owner assigned'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Due Date</label>
                                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className={`text-sm font-bold ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-600' : 'text-gray-800'}`}>
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                                                </span>
                                                {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' && (
                                                    <span className="ml-auto text-[10px] bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded-full">OVERDUE</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hours */}
                                        {(task.estimatedHours != null || task.actualHours != null) && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time Estimate</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                                        <p className="text-[10px] font-bold text-blue-600 mb-0.5">Estimated</p>
                                                        <p className="font-black text-gray-800 text-sm">{task.estimatedHours ?? '—'}h</p>
                                                    </div>
                                                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                                        <p className="text-[10px] font-bold text-emerald-600 mb-0.5">Actual</p>
                                                        <p className="font-black text-gray-800 text-sm">{task.actualHours ?? 0}h</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── Timer Panel ─── */}
                                {rightPanel === 'timer' && (
                                    <div className="space-y-4">
                                        <TimerWidget task={task} onRefresh={fetchDetails} />
                                        <PomodoroWidget task={task} onRefresh={fetchDetails} />
                                    </div>
                                )}

                                {/* ─── History Panel ─── */}
                                {rightPanel === 'history' && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-extrabold text-gray-700 flex items-center gap-2">
                                            <History className="w-4 h-4 text-gray-500" /> Version History
                                        </h4>
                                        <HistoryTimeline history={task.history} />
                                    </div>
                                )}

                                {/* ─── AI Panel ─── */}
                                {rightPanel === 'ai' && (
                                    <AIScorePanel taskId={id} />
                                )}
                            </div>
                        </div>

                        {/* ─── Watchers ─── */}
                        <WatchersPanel task={task} user={user} onRefresh={fetchDetails} />
                    </div>
                </div>

                {/* ─── AI Recommender Modal ─── */}
                {isRecommenderOpen && recommendations && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="glass-strong rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[85vh] overflow-y-auto">
                            <div className="flex justify-between items-center border-b border-line pb-4">
                                <h3 className="text-xl font-extrabold text-ink flex items-center gap-2">
                                    <Brain className="h-6 w-6 text-brand" /> Smart Assignee Recommendations
                                </h3>
                                <button onClick={() => setIsRecommenderOpen(false)} className="text-ink-faint hover:text-ink font-bold text-sm cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {recommendations.bestMatch && (
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-brand/30 p-6 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-brand">Best Match</span>
                                            <h4 className="text-lg font-black text-ink mt-1">{recommendations.bestMatch.userName}</h4>
                                        </div>
                                        <p className="text-3xl font-black text-brand">{recommendations.bestMatch.matchPercentage}%</p>
                                    </div>
                                    <p className="text-xs text-ink-soft whitespace-pre-wrap leading-relaxed bg-surface-2 p-4 rounded-xl border border-line font-medium">
                                        {recommendations.bestMatch.explanation}
                                    </p>
                                    <div className="flex justify-end">
                                        <button onClick={() => handleAssignMember(recommendations.bestMatch.userId)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition">
                                            Assign to {recommendations.bestMatch.userName}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {recommendations.alternatives?.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-ink-faint uppercase tracking-wider">Alternatives</h4>
                                    {recommendations.alternatives.map(alt => (
                                        <div key={alt.userId} className="bg-surface-2 border border-line p-4 rounded-xl flex justify-between items-center gap-4">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h5 className="font-bold text-ink text-sm">{alt.userName}</h5>
                                                    <span className="text-[10px] font-extrabold text-ink-faint">{alt.matchPercentage}%</span>
                                                </div>
                                                <p className="text-xs text-ink-soft leading-relaxed">{alt.explanation}</p>
                                            </div>
                                            <button onClick={() => handleAssignMember(alt.userId)}
                                                className="px-3 py-1.5 bg-white border border-line hover:bg-surface-2 text-ink font-bold rounded-lg text-xs transition">
                                                Assign
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Edit Modal ─── */}
                <TaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    task={task}
                    onTaskSaved={fetchDetails}
                />
            </div>
        </div>
    );
};

export default TaskDetailsPage;
