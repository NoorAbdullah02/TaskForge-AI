import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLogs, getActiveTimer, startTimer, pauseTimer, resumeTimer, stopTimer, restartTimer, createManualLog, getMyHoursSummary } from '../Services/timeApi';
import { getTasks } from '../Services/taskApi';
import { Clock, Play, Pause, RotateCcw, Square, Calendar, Plus, List, Loader2, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { socket } from '../Services/socket';

const TimeTracker = () => {
    const { user } = useAuth();
    
    // States
    const [logs, setLogs] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activeTimer, setActiveTimer] = useState(null);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Start form
    const [description, setDescription] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState('');
    
    // Manual form
    const [manualDesc, setManualDesc] = useState('');
    const [manualTaskId, setManualTaskId] = useState('');
    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    const [showManualModal, setShowManualModal] = useState(false);
    const [hoursSummary, setHoursSummary] = useState(null);

    // Refs
    const timerIntervalRef = useRef(null);

    // Load tasks & logs
    const loadTrackerData = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const [logsList, tasksList, active, summary] = await Promise.all([
                getLogs(),
                getTasks(),
                getActiveTimer(),
                getMyHoursSummary()
            ]);
            setLogs(logsList || []);
            setTasks(tasksList || []);
            setHoursSummary(summary || null);

            if (active) {
                setActiveTimer(active);
                setSecondsElapsed(active.elapsedSeconds ?? 0);
            } else {
                setActiveTimer(null);
                setSecondsElapsed(0);
            }
        } catch (error) {
            console.error('Failed to load tracker details:', error);
            toast.error('Could not load time tracking logs.');
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTrackerData();
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [user?.activeWorkspaceId, loadTrackerData]);

    useEffect(() => {
        if (!user?.id) return;

        const handleTimerEvent = (data) => {
            if (Number(data.userId) === Number(user.id)) {
                loadTrackerData(false); // reload silently
            }
        };

        socket.on('timer.started', handleTimerEvent);
        socket.on('timer.paused', handleTimerEvent);
        socket.on('timer.resumed', handleTimerEvent);
        socket.on('timer.stopped', handleTimerEvent);

        return () => {
            socket.off('timer.started', handleTimerEvent);
            socket.off('timer.paused', handleTimerEvent);
            socket.off('timer.resumed', handleTimerEvent);
            socket.off('timer.stopped', handleTimerEvent);
        };
    }, [user?.id, loadTrackerData]);

    // Active Timer tick handler — only ticks while running, freezes while paused
    useEffect(() => {
        if (activeTimer && activeTimer.status === 'running') {
            timerIntervalRef.current = setInterval(() => {
                setSecondsElapsed(prev => prev + 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [activeTimer]);

    const handleStartTimer = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const newTimer = await startTimer(description, selectedTaskId || null);
            setActiveTimer(newTimer);
            setSecondsElapsed(0);
            setDescription('');
            setSelectedTaskId('');
            toast.success('Timer started successfully! ⏱️');
            loadTrackerData();
        } catch (error) {
            console.error('Failed to start timer:', error);
            toast.error(error.response?.data?.message || 'Failed to start timer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStopTimer = async () => {
        try {
            setSubmitting(true);
            const stoppedLog = await stopTimer();
            toast.success(`Timer stopped! Logged ${formatDuration(stoppedLog.duration)}`);
            setActiveTimer(null);
            setSecondsElapsed(0);
            loadTrackerData();
        } catch (error) {
            console.error('Failed to stop timer:', error);
            toast.error('Failed to stop timer');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePauseTimer = async () => {
        try {
            setSubmitting(true);
            const updated = await pauseTimer();
            setActiveTimer(updated);
            toast.success('Timer paused.');
        } catch (error) {
            console.error('Failed to pause timer:', error);
            toast.error(error.response?.data?.message || 'Failed to pause timer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResumeTimer = async () => {
        try {
            setSubmitting(true);
            const updated = await resumeTimer();
            setActiveTimer(updated);
            toast.success('Timer resumed.');
        } catch (error) {
            console.error('Failed to resume timer:', error);
            toast.error(error.response?.data?.message || 'Failed to resume timer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRestartTimer = async (logId) => {
        try {
            setSubmitting(true);
            const newTimer = await restartTimer(logId);
            setActiveTimer(newTimer);
            setSecondsElapsed(0);
            toast.success('Timer restarted.');
            loadTrackerData();
        } catch (error) {
            console.error('Failed to restart timer:', error);
            toast.error(error.response?.data?.message || 'Failed to restart timer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualStart || !manualEnd) {
            toast.error('Start and end times are required');
            return;
        }

        try {
            setSubmitting(true);
            await createManualLog({
                description: manualDesc,
                taskId: manualTaskId || null,
                startTime: manualStart,
                endTime: manualEnd
            });
            toast.success('Manual log created! 📂');
            setShowManualModal(false);
            setManualDesc('');
            setManualTaskId('');
            setManualStart('');
            setManualEnd('');
            loadTrackerData();
        } catch (error) {
            console.error('Failed to create manual log:', error);
            toast.error(error.response?.data?.message || 'Manual entry failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Format helpers
    const formatDuration = (totalSeconds) => {
        if (!totalSeconds && totalSeconds !== 0) return '--:--';
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return [
            hrs.toString().padStart(2, '0'),
            mins.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    };

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-teal-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-line mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                            <Clock className="w-8 h-8 text-emerald-400" />
                            Time Tracking Station
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">
                            Measure billable hours, record project task time logs, and audit daily productivity workloads.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowManualModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-bold hover:bg-line transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-ink" />
                        Log Hours Manually
                    </button>
                </div>

                {/* Hours summary strip */}
                {hoursSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Today</span>
                            <span className="text-xl font-extrabold text-ink mt-0.5 block">{hoursSummary.todayHours}h</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">This Week</span>
                            <span className="text-xl font-extrabold text-ink mt-0.5 block">{hoursSummary.weekHours}h</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">This Month</span>
                            <span className="text-xl font-extrabold text-ink mt-0.5 block">{hoursSummary.monthHours}h</span>
                        </div>
                        <div className="bg-surface-2 border border-line p-5 rounded-2xl">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">All Time</span>
                            <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">{hoursSummary.totalHours}h</span>
                        </div>
                    </div>
                )}

                {/* Main timer widget */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                    
                    {/* Live Tracker Card */}
                    <div className="lg:col-span-8 bg-surface-2 border border-line rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
                        <div className="flex-1 space-y-4 w-full">
                            {activeTimer ? (
                                <div>
                                    <span className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Active Log Timer</span>
                                    <h3 className="text-sm font-bold text-ink mt-1">
                                        {activeTimer.description || <span className="italic text-ink-soft">Unlabeled tracking session</span>}
                                    </h3>
                                    {activeTimer.taskTitle && (
                                        <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold font-mono uppercase">
                                            <LinkIcon className="w-3 h-3" />
                                            {activeTimer.taskTitle}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleStartTimer} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Tracking Description</label>
                                            <input
                                                type="text"
                                                placeholder="What are you working on?"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-ink"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Link Active Task</label>
                                            <select
                                                value={selectedTaskId}
                                                onChange={(e) => setSelectedTaskId(e.target.value)}
                                                className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-300"
                                            >
                                                <option value="" className="bg-card text-ink-soft">Choose task (Optional)</option>
                                                {tasks.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-card text-ink">
                                                        {t.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] transition cursor-pointer"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Starting...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 text-ink" />
                                                Initialize Tracker
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Large digital clock */}
                        <div className="flex flex-col items-center justify-center p-6 bg-surface-2 border border-line rounded-2xl md:w-64 w-full">
                            <span className="text-[9px] font-black text-ink-soft uppercase tracking-widest block mb-2">Elapsed duration</span>
                            <div className="text-4xl font-extrabold text-ink font-mono tracking-wider">
                                {formatDuration(secondsElapsed)}
                            </div>
                            {activeTimer && (
                                <div className="mt-4 flex items-center gap-2">
                                    {activeTimer.status === 'running' ? (
                                        <button
                                            onClick={handlePauseTimer}
                                            disabled={submitting}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition text-xs font-bold cursor-pointer"
                                        >
                                            <Pause className="w-4 h-4" />
                                            Pause
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleResumeTimer}
                                            disabled={submitting}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition text-xs font-bold cursor-pointer"
                                        >
                                            <Play className="w-4 h-4" />
                                            Resume
                                        </button>
                                    )}
                                    <button
                                        onClick={handleStopTimer}
                                        disabled={submitting}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition text-xs font-bold cursor-pointer"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                                        Stop
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Stats summary */}
                    <div className="lg:col-span-4 bg-surface-2 border border-line rounded-3xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
                        <div>
                            <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest mb-4 flex items-center gap-2">
                                <List className="w-4 h-4 text-emerald-400" />
                                Daily Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-ink-soft font-semibold">Today's Logs</span>
                                    <span className="text-xs font-mono font-bold text-ink">{logs.length} entries</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-ink-soft font-semibold">Accumulated Time</span>
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                        {formatDuration(logs.reduce((acc, curr) => acc + (curr.duration || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-line pt-4 mt-4">
                            <span className="text-[10px] text-ink-soft font-sans block">Timer preserves status in database and will continue running even if you navigate away or close the app.</span>
                        </div>
                    </div>
                </div>

                {/* History table */}
                <div className="bg-surface-2 border border-line rounded-3xl p-6 shadow-xl backdrop-blur-md flex-1">
                    <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        Time Logs History
                    </h3>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            <span className="text-xs">Gathering work logs...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-xs text-ink-soft py-10 text-center font-sans">No work hours logged yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-ink font-sans border-collapse">
                                <thead>
                                    <tr className="border-b border-line text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                                        <th className="pb-3 pr-4">Work Description</th>
                                        <th className="pb-3 pr-4">Linked Task</th>
                                        <th className="pb-3 pr-4">Start Time</th>
                                        <th className="pb-3 pr-4">End Time</th>
                                        <th className="pb-3 pr-4 text-right">Duration</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-surface-2 transition-colors">
                                            <td className="py-3.5 font-bold text-ink pr-4">{log.description || <span className="text-ink-soft italic">No description</span>}</td>
                                            <td className="py-3.5 pr-4">
                                                {log.taskTitle ? (
                                                    <span className="px-2 py-0.5 rounded bg-surface-2 text-[10px] font-semibold text-indigo-300 border border-line">
                                                        {log.taskTitle}
                                                    </span>
                                                ) : (
                                                    <span className="text-ink-soft italic">None</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 font-mono text-ink-soft pr-4">{new Date(log.startTime).toLocaleString()}</td>
                                            <td className="py-3.5 font-mono text-ink-soft pr-4">{log.endTime ? new Date(log.endTime).toLocaleString() : <span className="text-emerald-400 font-bold uppercase text-[9px] animate-pulse">{log.status === 'paused' ? 'Paused' : 'Running'}</span>}</td>
                                            <td className="py-3.5 text-right font-mono font-bold text-ink pr-4">{formatDuration(log.duration)}</td>
                                            <td className="py-3.5 text-right">
                                                {log.status === 'stopped' && !activeTimer && (
                                                    <button
                                                        onClick={() => handleRestartTimer(log.id)}
                                                        disabled={submitting}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-line text-[10px] font-bold text-ink-soft hover:text-ink hover:bg-line transition cursor-pointer"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        Restart
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
            </div>

            {/* MANUAL LOG MODAL */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border border-line w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
                        <h2 className="text-lg font-extrabold text-ink mb-5 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-400" />
                            Log Time Manually
                        </h2>

                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Work Description</label>
                                <input
                                    type="text"
                                    placeholder="What did you work on?"
                                    value={manualDesc}
                                    onChange={(e) => setManualDesc(e.target.value)}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-ink"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Start Date/Time</label>
                                    <input
                                        type="datetime-local"
                                        value={manualStart}
                                        onChange={(e) => setManualStart(e.target.value)}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-ink"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">End Date/Time</label>
                                    <input
                                        type="datetime-local"
                                        value={manualEnd}
                                        onChange={(e) => setManualEnd(e.target.value)}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-ink"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Link Task</label>
                                <select
                                    value={manualTaskId}
                                    onChange={(e) => setManualTaskId(e.target.value)}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-300"
                                >
                                    <option value="" className="bg-card text-ink-soft">Choose task (Optional)</option>
                                    {tasks.map(t => (
                                        <option key={t.id} value={t.id} className="bg-card text-ink">
                                            {t.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    className="flex-1 py-3.5 bg-surface-2 hover:bg-line text-xs font-bold rounded-2xl transition cursor-pointer text-ink"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white rounded-2xl hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Log Record'
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

export default TimeTracker;
