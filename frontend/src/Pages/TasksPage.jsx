import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getTasks,
    updateTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    getTemplates,
    applyTemplate,
    createTemplate,
    archiveTask,
    duplicateTask,
} from '../Services/taskApi';
import { getProjects } from '../Services/projectApi';
import TaskModal from '../Components/TaskModal';
import KanbanBoard from '../Components/KanbanBoard';

import {
    CheckSquare, Plus, LayoutGrid, List, Filter, Calendar, AlertCircle,
    Loader, Loader2, Trophy, ArrowRight, ChevronDown, Trash2, Copy, Archive,
    RefreshCw, LayoutTemplate, Tag, Layers, Users, CheckCircle2,
    SlidersHorizontal, Search, X, Star, Lock, Eye, Clock, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABELS = {
    backlog: 'Backlog',
    todo: 'To Do',
    'in-progress': 'In Progress',
    review: 'In Review',
    done: 'Completed',
};

const STATUS_STATES = Object.keys(STATUS_LABELS);

const STATUS_COLORS = {
    backlog: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    todo: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    'in-progress': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    review: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    done: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ─── Bulk Toolbar ──────────────────────────────────────────────────────────
const BulkToolbar = ({
    selectedIds, tasks, onBulkStatusChange, onBulkDelete, onBulkArchive, onBulkDuplicate, onClear,
    isBulkChangingStatus, isBulkDeleting, isBulkArchiving, isBulkDuplicating,
}) => {
    const [statusDropdown, setStatusDropdown] = useState(false);

    if (selectedIds.length === 0) return null;

    const anyBulkActionInFlight = isBulkChangingStatus || isBulkDeleting || isBulkArchiving || isBulkDuplicating;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl px-6 py-3.5 flex items-center gap-4 animate-slide-up">
            <span className="text-sm font-bold text-blue-400">{selectedIds.length} selected</span>
            <div className="w-px h-5 bg-slate-850" />

            {/* Status Change */}
            <div className="relative">
                <button
                    onClick={() => setStatusDropdown(p => !p)}
                    disabled={anyBulkActionInFlight}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isBulkChangingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Change Status <ChevronDown className="w-3 h-3" />
                </button>
                {statusDropdown && (
                    <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 min-w-[140px] z-50">
                        {STATUS_STATES.map(s => (
                            <button
                                key={s}
                                onClick={() => { setStatusDropdown(false); onBulkStatusChange(s); }}
                                disabled={anyBulkActionInFlight}
                                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-700 transition cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {STATUS_LABELS[s]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={onBulkDuplicate}
                disabled={anyBulkActionInFlight}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isBulkDuplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />} Duplicate
            </button>

            <button
                onClick={onBulkArchive}
                disabled={anyBulkActionInFlight}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-amber-900/60 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isBulkArchiving ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-amber-400" />} Archive
            </button>

            <button
                onClick={onBulkDelete}
                disabled={anyBulkActionInFlight}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-950 rounded-xl text-xs font-bold transition text-red-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
            </button>

            <div className="w-px h-5 bg-slate-800" />
            <button onClick={onClear} className="text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// ─── Template Panel ────────────────────────────────────────────────────────
const TemplatePanel = ({ templates, onApply, onCreateTemplate, projects, onClose }) => {
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [applyingTemplateId, setApplyingTemplateId] = useState(null);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

    const handleApplyClick = async (templateId) => {
        setApplyingTemplateId(templateId);
        try {
            await onApply(templateId, selectedProjectId);
        } finally {
            setApplyingTemplateId(null);
        }
    };

    const handleCreateClick = async () => {
        setIsCreatingTemplate(true);
        try {
            await onCreateTemplate({ title: newName, description: newDesc });
        } finally {
            setIsCreatingTemplate(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-line rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-line flex justify-between items-center bg-surface-2/40">
                    <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-blue-400" /> Task Templates
                    </h3>
                    <button onClick={onClose} className="text-ink-soft hover:text-ink transition cursor-pointer"><X className="w-5 h-5" /></button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-card">
                    {/* Apply Template */}
                    <div>
                        <p className="text-xs font-extrabold uppercase text-ink-soft mb-3 tracking-wider">Available Templates</p>
                        {templates.length === 0 ? (
                            <p className="text-ink-faint text-sm text-center py-4 italic">No templates created yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3.5 bg-surface-2/40 rounded-xl border border-line">
                                        <div>
                                            <p className="font-bold text-sm text-ink">{t.title}</p>
                                            {t.description && <p className="text-xs text-ink-soft font-medium mt-0.5">{t.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                                className="px-2.5 py-1.5 border border-line rounded-xl text-xs font-semibold text-ink bg-surface-2 focus:outline-none"
                                            >
                                                <option value="" className="bg-card text-ink">Select project</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-card text-ink">{p.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => selectedProjectId && handleApplyClick(t.id)}
                                                disabled={applyingTemplateId === t.id}
                                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                            >
                                                {applyingTemplateId === t.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create Template */}
                    <div className="border-t border-line pt-5">
                        <p className="text-xs font-extrabold uppercase text-ink-soft mb-3 tracking-wider">Create New Template</p>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Template name..."
                                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-ink"
                            />
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Description (optional)..."
                                rows={2}
                                className="w-full p-4 bg-surface-2 border border-line rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-ink leading-normal resize-none h-20"
                            />
                            <button
                                onClick={handleCreateClick}
                                disabled={!newName.trim() || isCreatingTemplate}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl text-xs transition hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10"
                            >
                                {isCreatingTemplate ? <Loader2 className="w-4 h-4 inline mr-1 text-white animate-spin" /> : <Plus className="w-4 h-4 inline mr-1 text-white" />} Save Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Task Row (List View) ──────────────────────────────────────────────────
const TaskRow = ({ task, selected, onSelect, onNavigate, onEdit }) => (
    <tr
        onClick={() => onNavigate(task.id)}
        className="border-b border-line hover:bg-surface-2/40 transition cursor-pointer group"
    >
        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
            <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(task.id)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
        </td>
        <td className="px-4 py-4">
            <div className="flex items-center gap-2">
                {task.isMilestone && <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />}
                {task.isLocked && <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                {task.isRecurring && <RefreshCw className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                <span className="font-bold text-ink text-sm leading-tight">{task.title}</span>
            </div>
            {(task.labels || task.category) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {task.category && (
                        <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold border border-indigo-500/20">
                            {task.category}
                        </span>
                    )}
                    {task.labels && task.labels.split(',').map(l => l.trim()).filter(Boolean).slice(0, 3).map(label => (
                        <span key={label} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">
                            #{label}
                        </span>
                    ))}
                </div>
            )}
        </td>
        <td className="px-4 py-4 text-ink-soft font-semibold text-sm">{task.projectName || '—'}</td>
        <td className="px-4 py-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[task.status] || 'bg-slate-500/10 text-slate-400'}`}>
                {STATUS_LABELS[task.status] || task.status}
            </span>
        </td>
        <td className="px-4 py-4">
            <span className={`px-2 py-0.5 rounded text-xs font-extrabold uppercase border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                {task.priority}
            </span>
        </td>
        <td className="px-4 py-4">
            {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold">
                    <Clock className="w-3.5 h-3.5 text-ink-faint" />
                    {task.estimatedHours}h
                </div>
            )}
        </td>
        <td className="px-4 py-4 text-ink-soft text-sm font-semibold">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
        </td>
        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                    onClick={() => onEdit(task)}
                    className="text-blue-500 hover:text-blue-400 text-xs font-extrabold cursor-pointer"
                >Edit</button>
                <span className="text-line">|</span>
                <button
                    onClick={() => onNavigate(task.id)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-extrabold flex items-center gap-0.5 cursor-pointer"
                >
                    Details <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </td>
    </tr>
);

// ─── Stats Bar ─────────────────────────────────────────────────────────────
const StatsBar = ({ tasks }) => {
    const done = tasks.filter(t => t.status === 'done').length;
    const inProg = tasks.filter(t => t.status === 'in-progress').length;
    const over = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    const locked = tasks.filter(t => t.isLocked).length;

    const stats = [
        { label: 'Total', value: tasks.length, icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        { label: 'Completed', value: done, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: 'In Progress', value: inProg, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        { label: 'Overdue', value: over, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        { label: 'Locked', value: locked, icon: Lock, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3 border shadow-sm`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-card shadow-sm border border-line">
                        <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                        <p className="text-xl font-black text-ink">{value}</p>
                        <p className={`text-xs font-bold ${color}`}>{label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
const TasksPage = () => {
    const { isLoggedIn, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('kanban');

    // Filters
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkChangingStatus, setIsBulkChangingStatus] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkArchiving, setIsBulkArchiving] = useState(false);
    const [isBulkDuplicating, setIsBulkDuplicating] = useState(false);

    // Panels
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showTemplatePanel, setShowTemplatePanel] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const navigate = useNavigate();
    const headerRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !isLoggedIn) navigate('/login');
    }, [isLoggedIn, authLoading, navigate]);

    useEffect(() => {
        if (!isLoading && headerRef.current) {
            gsap.from([...headerRef.current.children], {
                y: -28, opacity: 0, stagger: 0.1, duration: 0.85, ease: 'power3.out',
            });
        }
    }, [isLoading]);

    const fetchFiltersData = useCallback(async () => {
        const [projectsResult, templatesResult] = await Promise.allSettled([
            getProjects(),
            getTemplates(),
        ]);
        if (projectsResult.status === 'fulfilled') setProjects(projectsResult.value);
        else console.error('Error fetching projects:', projectsResult.reason);

        if (templatesResult.status === 'fulfilled') setTemplates(templatesResult.value);
        else console.error('Error fetching templates:', templatesResult.reason);
    }, []);

    const fetchTasksList = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {};
            if (selectedProject) params.projectId = selectedProject;
            if (selectedStatus) params.status = selectedStatus;
            if (selectedPriority) params.priority = selectedPriority;
            if (showArchived) params.archived = true;

            const data = await getTasks(params);
            setTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setIsLoading(false);
        }
    }, [selectedProject, selectedStatus, selectedPriority, showArchived]);

    useEffect(() => { if (isLoggedIn) fetchFiltersData(); }, [isLoggedIn, fetchFiltersData]);
    useEffect(() => { if (isLoggedIn) fetchTasksList(); }, [isLoggedIn, fetchTasksList]);

    const handleTaskSaved = () => { fetchTasksList(); setEditingTask(null); };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            await updateTask(taskId, { status: newStatus });
            fetchTasksList();
        } catch { toast.error('Failed to update status'); }
    };

    // ─── Selection ─────────────────────────────────────────────────────────
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAll = () => {
        const visible = filteredTasks.map(t => t.id);
        setSelectedIds(prev => prev.length === visible.length ? [] : visible);
    };

    // ─── Bulk Actions ──────────────────────────────────────────────────────
    const handleBulkStatusChange = async (status) => {
        setIsBulkChangingStatus(true);
        try {
            await bulkUpdateTasks(selectedIds, { status });
            toast.success(`${selectedIds.length} tasks updated to ${STATUS_LABELS[status]}`);
            setSelectedIds([]);
            fetchTasksList();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Bulk status update failed');
        } finally {
            setIsBulkChangingStatus(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} tasks permanently?`)) return;
        setIsBulkDeleting(true);
        try {
            await bulkDeleteTasks(selectedIds);
            toast.success(`${selectedIds.length} tasks deleted`);
            setSelectedIds([]);
            fetchTasksList();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Bulk delete failed');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkArchive = async () => {
        setIsBulkArchiving(true);
        try {
            await Promise.all(selectedIds.map(id => archiveTask(id)));
            toast.success(`${selectedIds.length} tasks archived`);
            setSelectedIds([]);
            fetchTasksList();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Bulk archive failed');
        } finally {
            setIsBulkArchiving(false);
        }
    };

    const handleBulkDuplicate = async () => {
        setIsBulkDuplicating(true);
        try {
            await Promise.all(selectedIds.map(id => duplicateTask(id)));
            toast.success(`${selectedIds.length} tasks duplicated`);
            setSelectedIds([]);
            fetchTasksList();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Bulk duplicate failed');
        } finally {
            setIsBulkDuplicating(false);
        }
    };

    // ─── Templates ─────────────────────────────────────────────────────────
    const handleApplyTemplate = async (templateId, projectId) => {
        try {
            await applyTemplate(templateId, projectId);
            toast.success('Template applied — task created!');
            setShowTemplatePanel(false);
            fetchTasksList();
        } catch { toast.error('Failed to apply template'); }
    };

    const handleCreateTemplate = async (data) => {
        try {
            await createTemplate(data);
            toast.success('Template saved!');
            fetchFiltersData();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to create template');
        }
    };

    // ─── Filtered tasks ────────────────────────────────────────────────────
    const filteredTasks = tasks.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.title?.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.labels?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q)
        );
    });

    // ─── Render ────────────────────────────────────────────────────────────
    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-ink-soft font-semibold">Loading task workspace...</p>
                </div>
            </div>
        );
    }

    const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.includes(t.id));

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col bg-surface">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">

                {/* ─── Header ─── */}
                <div ref={headerRef} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-gradient-member shadow-lg shadow-glow-teal">
                                <CheckSquare className="w-6 h-6 text-white" />
                            </span>
                            <span className="bg-gradient-member bg-clip-text text-transparent">Task Workspace</span>
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">Enterprise task management — Jira-level power.</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowTemplatePanel(true)}
                            className="px-4 py-3 bg-surface-2 hover:bg-surface-3 border border-line text-ink font-bold rounded-2xl hover:border-blue-500/50 hover:text-blue-400 transition flex items-center gap-2 text-xs cursor-pointer shadow-sm active:scale-95"
                        >
                            <LayoutTemplate className="w-4.5 h-4.5 text-blue-400" /> Templates
                        </button>
                        <button
                            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2 text-xs border border-blue-500/20 cursor-pointer"
                        >
                            <Plus className="w-4.5 h-4.5 text-white" /> New Task
                        </button>
                    </div>
                </div>

                <StatsBar tasks={tasks} />

                <div className="bg-card border border-line rounded-3xl p-5 shadow-soft mb-8">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full md:max-w-xs">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tasks, labels..."
                                className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-line rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-400 text-ink"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setShowFilters(p => !p)}
                                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition ${showFilters ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : 'border-line text-ink-soft bg-surface-2 hover:border-line-active'}`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                            </button>

                            <button
                                onClick={() => setShowArchived(p => !p)}
                                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition ${showArchived ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-line text-ink-soft bg-surface-2 hover:border-line-active'}`}
                            >
                                <Archive className="w-3.5 h-3.5" /> {showArchived ? 'Archived' : 'Active'}
                            </button>

                            <div className="flex bg-surface-2/60 p-1 rounded-xl border border-line">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${viewMode === 'kanban' ? 'bg-card text-blue-400 shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> Board
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${viewMode === 'list' ? 'bg-card text-blue-400 shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                                >
                                    <List className="w-3.5 h-3.5" /> List
                                </button>
                            </div>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-3">
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-blue-500"
                            >
                                <option value="" className="bg-card text-ink">All Projects</option>
                                {projects.map(p => <option key={p.id} value={p.id} className="bg-card text-ink">{p.name}</option>)}
                            </select>

                            <select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                                className="px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-blue-500"
                            >
                                <option value="" className="bg-card text-ink">All Priorities</option>
                                <option value="low" className="bg-card text-ink">Low</option>
                                <option value="medium" className="bg-card text-ink">Medium</option>
                                <option value="high" className="bg-card text-ink">High</option>
                                <option value="critical" className="bg-card text-ink">Critical</option>
                            </select>

                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-blue-500"
                            >
                                <option value="" className="bg-card text-ink">All Statuses</option>
                                {STATUS_STATES.map(st => <option key={st} value={st} className="bg-card text-ink">{STATUS_LABELS[st]}</option>)}
                            </select>

                            {(selectedProject || selectedPriority || selectedStatus) && (
                                <button
                                    onClick={() => { setSelectedProject(''); setSelectedPriority(''); setSelectedStatus(''); }}
                                    className="px-3 py-2 bg-surface-2 hover:bg-surface-3 text-ink-soft font-bold rounded-xl text-xs transition border border-line flex items-center gap-1 cursor-pointer"
                                >
                                    <X className="w-3 h-3" /> Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {filteredTasks.length === 0 ? (
                    <div className="bg-card rounded-3xl p-16 text-center shadow-soft border border-line max-w-lg mx-auto mt-10">
                        <CheckSquare className="w-20 h-20 text-ink-faint/30 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-ink mb-2">No tasks found</h3>
                        <p className="text-ink-soft font-medium mb-6">Adjust filters or create a new task to get started.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition shadow-lg shadow-blue-500/20 cursor-pointer"
                        >
                            <Plus className="w-4 h-4 inline mr-1 text-white" /> Create Task
                        </button>
                    </div>
                ) : viewMode === 'kanban' ? (
                    <KanbanBoard
                        tasks={filteredTasks}
                        setTasks={setTasks}
                        onCardClick={(id) => navigate(`/tasks/${id}`)}
                        priorityColors={PRIORITY_COLORS}
                        statusStates={STATUS_STATES}
                        statusTitles={STATUS_LABELS}
                    />
                ) : (
                    <div className="bg-card rounded-3xl shadow-soft border border-line overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-2/40 border-b border-line">
                                    <tr>
                                        <th className="px-4 py-3.5">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={selectAll}
                                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                            />
                                        </th>
                                        {['Task', 'Project', 'Status', 'Priority', 'Est.', 'Due Date', ''].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left font-bold text-ink-soft text-xs uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.map(t => (
                                        <TaskRow
                                            key={t.id}
                                            task={t}
                                            selected={selectedIds.includes(t.id)}
                                            onSelect={toggleSelect}
                                            onNavigate={(id) => navigate(`/tasks/${id}`)}
                                            onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <BulkToolbar
                    selectedIds={selectedIds}
                    tasks={tasks}
                    onBulkStatusChange={handleBulkStatusChange}
                    onBulkDelete={handleBulkDelete}
                    onBulkArchive={handleBulkArchive}
                    onBulkDuplicate={handleBulkDuplicate}
                    onClear={() => setSelectedIds([])}
                    isBulkChangingStatus={isBulkChangingStatus}
                    isBulkDeleting={isBulkDeleting}
                    isBulkArchiving={isBulkArchiving}
                    isBulkDuplicating={isBulkDuplicating}
                />

                {/* ─── Modals ─── */}
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    task={editingTask}
                    onTaskSaved={handleTaskSaved}
                />

                {showTemplatePanel && (
                    <TemplatePanel
                        templates={templates}
                        projects={projects}
                        onApply={handleApplyTemplate}
                        onCreateTemplate={handleCreateTemplate}
                        onClose={() => setShowTemplatePanel(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default TasksPage;
