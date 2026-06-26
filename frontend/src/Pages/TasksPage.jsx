import { useState, useEffect, useCallback } from 'react';
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
    Loader, Trophy, ArrowRight, ChevronDown, Trash2, Copy, Archive,
    RefreshCw, LayoutTemplate, Tag, Layers, Users, CheckCircle2,
    SlidersHorizontal, Search, X, Star, Lock, Eye, Clock, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
    low: 'bg-gray-100 text-gray-700 border-gray-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-100',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
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
    backlog: 'bg-gray-100 text-gray-600',
    todo: 'bg-blue-50 text-blue-700',
    'in-progress': 'bg-amber-50 text-amber-700',
    review: 'bg-purple-50 text-purple-700',
    done: 'bg-emerald-50 text-emerald-700',
};

// ─── Bulk Toolbar ──────────────────────────────────────────────────────────
const BulkToolbar = ({ selectedIds, tasks, onBulkStatusChange, onBulkDelete, onBulkArchive, onBulkDuplicate, onClear }) => {
    const [statusDropdown, setStatusDropdown] = useState(false);

    if (selectedIds.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 border border-gray-700 animate-slide-up">
            <span className="text-sm font-bold text-blue-400">{selectedIds.length} selected</span>
            <div className="w-px h-5 bg-gray-700" />

            {/* Status Change */}
            <div className="relative">
                <button
                    onClick={() => setStatusDropdown(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Change Status <ChevronDown className="w-3 h-3" />
                </button>
                {statusDropdown && (
                    <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[140px] z-50">
                        {STATUS_STATES.map(s => (
                            <button
                                key={s}
                                onClick={() => { onBulkStatusChange(s); setStatusDropdown(false); }}
                                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-gray-700 transition"
                            >
                                {STATUS_LABELS[s]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={onBulkDuplicate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition"
            >
                <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>

            <button
                onClick={onBulkArchive}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-amber-900 rounded-xl text-xs font-bold transition"
            >
                <Archive className="w-3.5 h-3.5 text-amber-400" /> Archive
            </button>

            <button
                onClick={onBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-900 rounded-xl text-xs font-bold transition text-red-300"
            >
                <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>

            <div className="w-px h-5 bg-gray-700" />
            <button onClick={onClear} className="text-gray-400 hover:text-white transition">
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-blue-600" /> Task Templates
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition"><X className="w-5 h-5" /></button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Apply Template */}
                    <div>
                        <p className="text-xs font-extrabold uppercase text-gray-500 mb-3 tracking-wider">Available Templates</p>
                        {templates.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No templates created yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{t.name}</p>
                                            {t.description && <p className="text-xs text-gray-500 font-medium">{t.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                                className="px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white"
                                            >
                                                <option value="">Select project</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => selectedProjectId && onApply(t.id, selectedProjectId)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create Template */}
                    <div className="border-t border-gray-100 pt-5">
                        <p className="text-xs font-extrabold uppercase text-gray-500 mb-3 tracking-wider">Create New Template</p>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Template name..."
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-400"
                            />
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Description (optional)..."
                                rows={2}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 resize-none"
                            />
                            <button
                                onClick={() => onCreateTemplate({ name: newName, description: newDesc })}
                                disabled={!newName.trim()}
                                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm transition hover:opacity-90 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4 inline mr-1" /> Save Template
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
        className="border-b border-gray-100 hover:bg-gray-50/60 transition cursor-pointer group"
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
                <span className="font-bold text-gray-800 text-sm leading-tight">{task.title}</span>
            </div>
            {(task.labels || task.category) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {task.category && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100">
                            {task.category}
                        </span>
                    )}
                    {task.labels && task.labels.split(',').map(l => l.trim()).filter(Boolean).slice(0, 3).map(label => (
                        <span key={label} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100">
                            #{label}
                        </span>
                    ))}
                </div>
            )}
        </td>
        <td className="px-4 py-4 text-gray-600 font-semibold text-sm">{task.projectName || '—'}</td>
        <td className="px-4 py-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
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
                <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    {task.estimatedHours}h
                </div>
            )}
        </td>
        <td className="px-4 py-4 text-gray-600 text-sm font-semibold">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
        </td>
        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                    onClick={() => onEdit(task)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-extrabold"
                >Edit</button>
                <span className="text-gray-200">|</span>
                <button
                    onClick={() => onNavigate(task.id)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-extrabold flex items-center gap-0.5"
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
        { label: 'Total', value: tasks.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Completed', value: done, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'In Progress', value: inProg, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Overdue', value: over, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Locked', value: locked, icon: Lock, color: 'text-violet-600', bg: 'bg-violet-50' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                        <p className="text-xl font-black text-gray-800">{value}</p>
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

    // Panels
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showTemplatePanel, setShowTemplatePanel] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isLoggedIn) navigate('/login');
    }, [isLoggedIn, authLoading, navigate]);

    const fetchFiltersData = useCallback(async () => {
        try {
            const [projectsList, templatesList] = await Promise.all([
                getProjects(),
                getTemplates(),
            ]);
            setProjects(projectsList);
            setTemplates(templatesList);
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
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
        try {
            await bulkUpdateTasks(selectedIds, { status });
            toast.success(`${selectedIds.length} tasks updated to ${STATUS_LABELS[status]}`);
            setSelectedIds([]);
            fetchTasksList();
        } catch { toast.error('Bulk status update failed'); }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} tasks permanently?`)) return;
        try {
            await bulkDeleteTasks(selectedIds);
            toast.success(`${selectedIds.length} tasks deleted`);
            setSelectedIds([]);
            fetchTasksList();
        } catch { toast.error('Bulk delete failed'); }
    };

    const handleBulkArchive = async () => {
        try {
            await Promise.all(selectedIds.map(id => archiveTask(id)));
            toast.success(`${selectedIds.length} tasks archived`);
            setSelectedIds([]);
            fetchTasksList();
        } catch { toast.error('Bulk archive failed'); }
    };

    const handleBulkDuplicate = async () => {
        try {
            await Promise.all(selectedIds.map(id => duplicateTask(id)));
            toast.success(`${selectedIds.length} tasks duplicated`);
            setSelectedIds([]);
            fetchTasksList();
        } catch { toast.error('Bulk duplicate failed'); }
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
        } catch { toast.error('Failed to create template'); }
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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading task workspace...</p>
                </div>
            </div>
        );
    }

    const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.includes(t.id));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
            <div className="max-w-7xl mx-auto">

                {/* ─── Header ─── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
                            <CheckSquare className="w-10 h-10 text-blue-600" />
                            Task Workspace
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">Enterprise task management — Jira-level power.</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowTemplatePanel(true)}
                            className="px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 transition flex items-center gap-2 text-sm bg-white shadow-sm"
                        >
                            <LayoutTemplate className="w-4 h-4" /> Templates
                        </button>
                        <button
                            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-5 h-5" /> New Task
                        </button>
                    </div>
                </div>

                <StatsBar tasks={tasks} />

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full md:max-w-xs">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tasks, labels..."
                                className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-400 bg-gray-50"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setShowFilters(p => !p)}
                                className={`flex items-center gap-1.5 px-3 py-2 border-2 rounded-xl text-xs font-bold transition ${showFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 bg-white hover:border-blue-300'}`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                            </button>

                            <button
                                onClick={() => setShowArchived(p => !p)}
                                className={`flex items-center gap-1.5 px-3 py-2 border-2 rounded-xl text-xs font-bold transition ${showArchived ? 'border-amber-400 text-amber-700 bg-amber-50' : 'border-gray-200 text-gray-600 bg-white hover:border-amber-300'}`}
                            >
                                <Archive className="w-3.5 h-3.5" /> {showArchived ? 'Archived' : 'Active'}
                            </button>

                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> Board
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    <List className="w-3.5 h-3.5" /> List
                                </button>
                            </div>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white"
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            <select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white"
                            >
                                <option value="">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>

                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white"
                            >
                                <option value="">All Statuses</option>
                                {STATUS_STATES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                            </select>

                            {(selectedProject || selectedPriority || selectedStatus) && (
                                <button
                                    onClick={() => { setSelectedProject(''); setSelectedPriority(''); setSelectedStatus(''); }}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {filteredTasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow border border-gray-100 max-w-lg mx-auto mt-10">
                        <CheckSquare className="w-20 h-20 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No tasks found</h3>
                        <p className="text-gray-400 font-medium mb-6">Adjust filters or create a new task to get started.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition shadow"
                        >
                            <Plus className="w-4 h-4 inline mr-1" /> Create Task
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
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={selectAll}
                                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                            />
                                        </th>
                                        {['Task', 'Project', 'Status', 'Priority', 'Est.', 'Due Date', ''].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wider">{h}</th>
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
