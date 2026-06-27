import React, { useState, useEffect } from 'react';
import { 
    Calendar, Plus, Play, CheckCircle2, ChevronDown, ChevronRight, 
    MoreHorizontal, Search, Loader2, ArrowRight, ClipboardList, 
    Clock, AlertCircle, Sparkles, User, Badge, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { getSprints, createSprint, updateSprint, deleteSprint, startSprint, completeSprint } from '../Services/agileApi';
import { getProjects } from '../Services/projectApi';
import { getTasks, updateTask } from '../Services/taskApi';
import { getAdminUsers } from '../Services/adminApi';
import { socket } from '../Services/socket';


export default function SprintPlanningPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';
    const isManager = user?.role === 'manager';

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [sprints, setSprints] = useState([]);
    const [tasksList, setTasksList] = useState([]);
    const [usersList, setUsersList] = useState([]);

    // Modals
    const [sprintModalOpen, setSprintModalOpen] = useState(false);
    const [sprintForm, setSprintForm] = useState({ name: '', startDate: '', endDate: '', goal: '' });
    const [submittingSprint, setSubmittingSprint] = useState(false);

    // Collapsed states
    const [collapsedBacklog, setCollapsedBacklog] = useState(false);
    const [collapsedSprints, setCollapsedSprints] = useState({});

    // Filter
    const [taskSearch, setTaskSearch] = useState('');

    const loadProjects = async () => {
        try {
            const projectsData = await getProjects();
            setProjects(projectsData);
            if (projectsData.length > 0) {
                setSelectedProjectId(projectsData[0].id.toString());
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            toast.error('Failed to load projects');
            setLoading(false);
        }
    };

    const loadSprintData = async () => {
        if (!selectedProjectId) return;
        setLoading(true);
        try {
            const sprintsData = await getSprints(parseInt(selectedProjectId, 10));
            setSprints(sprintsData);

            const tasksData = await getTasks({ projectId: parseInt(selectedProjectId, 10) });
            setTasksList(tasksData);

            const usersData = await getAdminUsers();
            setUsersList(usersData);
        } catch (error) {
            console.error('Failed to load sprints and tasks:', error);
            toast.error('Failed to load sprint metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        loadSprintData();
    }, [selectedProjectId]);

    useEffect(() => {
        if (!selectedProjectId) return;

        const handleSprintUpdated = (data) => {
            if (parseInt(data.projectId) === parseInt(selectedProjectId)) {
                loadSprintData();
            }
        };

        const handleTaskUpdated = (data) => {
            if (parseInt(data.projectId) === parseInt(selectedProjectId)) {
                loadSprintData();
            }
        };

        socket.on('sprint_updated', handleSprintUpdated);
        socket.on('task_updated', handleTaskUpdated);

        return () => {
            socket.off('sprint_updated', handleSprintUpdated);
            socket.off('task_updated', handleTaskUpdated);
        };
    }, [selectedProjectId]);


    // Backlog tasks (no sprintId assigned)
    const backlogTasks = tasksList.filter(t => 
        t.sprintId === null && 
        (t.title?.toLowerCase().includes(taskSearch.toLowerCase()) || 
         t.description?.toLowerCase().includes(taskSearch.toLowerCase()))
    );

    // Sprints
    const activeSprint = sprints.find(s => s.status === 'active');
    const futureSprints = sprints.filter(s => s.status === 'future');
    const completedSprints = sprints.filter(s => s.status === 'completed');

    const handleCreateSprint = async (e) => {
        e.preventDefault();
        if (!sprintForm.name.trim()) {
            toast.error('Sprint name is required');
            return;
        }

        setSubmittingSprint(true);
        try {
            await createSprint({
                projectId: parseInt(selectedProjectId, 10),
                name: sprintForm.name.trim(),
                startDate: sprintForm.startDate || null,
                endDate: sprintForm.endDate || null,
                goal: sprintForm.goal
            });
            toast.success('Sprint created successfully');
            setSprintModalOpen(false);
            setSprintForm({ name: '', startDate: '', endDate: '', goal: '' });
            loadSprintData();
        } catch (error) {
            console.error('Sprint creation failed:', error);
            toast.error('Failed to create sprint');
        } finally {
            setSubmittingSprint(false);
        }
    };

    const handleStartSprint = async (sprintId) => {
        if (!isAdmin && !isManager) return;
        try {
            await startSprint(sprintId);
            toast.success('Sprint started successfully');
            loadSprintData();
        } catch (error) {
            console.error('Sprint launch failed:', error);
            toast.error(error.response?.data?.message || 'Failed to start sprint');
        }
    };

    const handleCompleteSprint = async (sprintId) => {
        if (!isAdmin && !isManager) return;
        if (!confirm('Are you sure you want to complete this sprint? Any uncompleted tasks will automatically return to the backlog.')) {
            return;
        }

        try {
            const res = await completeSprint(sprintId);
            toast.success(`Sprint completed! Returned ${res.movedTasksCount} tasks to backlog.`);
            loadSprintData();
        } catch (error) {
            console.error('Sprint completion failed:', error);
            toast.error('Failed to complete sprint');
        }
    };

    const handleMoveTaskToSprint = async (taskId, sprintId) => {
        try {
            await updateTask(taskId, { sprintId: sprintId ? parseInt(sprintId, 10) : null });
            toast.success('Task location updated');
            loadSprintData();
        } catch (error) {
            console.error('Task move failed:', error);
            toast.error('Failed to relocate task');
        }
    };

    const handleToggleCollapseSprint = (id) => {
        setCollapsedSprints(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDeleteSprintClick = async (id, name) => {
        if (!isAdmin && !isManager) return;
        if (!confirm(`Are you sure you want to delete the sprint "${name}"? all tasks will return to backlog.`)) {
            return;
        }
        try {
            await deleteSprint(id);
            toast.success('Sprint deleted');
            loadSprintData();
        } catch (error) {
            console.error('Failed to delete sprint:', error);
            toast.error('Failed to delete sprint');
        }
    };

    if (projects.length === 0 && !loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white rounded-3xl border border-blue-100 shadow-xl p-8 max-w-md text-center">
                    <ClipboardList className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">No active projects</h3>
                    <p className="text-gray-400 text-xs mt-2">You need to create a project first before planning sprints and task backlogs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200/60 mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-blue-600" />
                            Agile Sprint Planning & Backlog
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Create sprints, prioritize project backlogs, allocate story points, and run sprints.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Project selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Project:</span>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="px-4 py-2 bg-white border border-blue-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Create Sprint Button */}
                        {(isAdmin || isManager) && (
                            <button
                                onClick={() => setSprintModalOpen(true)}
                                className="flex items-center gap-1.5 px-4.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Create Sprint
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Left & Middle columns: Active Sprints & Future Sprints */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* ACTIVE SPRINT */}
                            <div className="bg-white border border-blue-100/60 rounded-3xl p-6 shadow-xl shadow-blue-100/10">
                                <div className="flex justify-between items-center mb-4 border-b border-gray-150 pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-gray-800">
                                                {activeSprint ? activeSprint.name : 'No Active Sprint'}
                                            </h2>
                                            {activeSprint && (
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        {activeSprint?.goal && (
                                            <p className="text-gray-400 text-xs mt-1">Goal: {activeSprint.goal}</p>
                                        )}
                                    </div>
                                    {activeSprint && (isAdmin || isManager) && (
                                        <button
                                            onClick={() => handleCompleteSprint(activeSprint.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-600 text-xs font-bold rounded-2xl hover:bg-blue-50/50 transition cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                            Complete Sprint
                                        </button>
                                    )}
                                </div>

                                {activeSprint ? (
                                    <div className="space-y-2">
                                        {tasksList.filter(t => t.sprintId === activeSprint.id).map(t => (
                                            <div key={t.id} className="p-3.5 bg-slate-50/40 hover:bg-blue-50/30 border border-slate-100 rounded-2xl transition flex items-center justify-between text-xs font-medium">
                                                <div>
                                                    <span className="font-bold text-gray-800 text-sm block">{t.title}</span>
                                                    <span className="text-[10px] text-gray-400">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                        t.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                                                        t.status === 'in_progress' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                    <select
                                                        onChange={(e) => handleMoveTaskToSprint(t.id, e.target.value)}
                                                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] focus:outline-none"
                                                        value={activeSprint.id.toString()}
                                                    >
                                                        <option value={activeSprint.id}>Active Sprint</option>
                                                        <option value="">Move to Backlog</option>
                                                        {futureSprints.map(fs => (
                                                            <option key={fs.id} value={fs.id}>Move to {fs.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}

                                        {tasksList.filter(t => t.sprintId === activeSprint.id).length === 0 && (
                                            <p className="text-gray-400 text-center py-6 italic">No tasks in active sprint. Drag backlog items here.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
                                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500 font-semibold text-sm">Sprint board is empty</p>
                                        <p className="text-gray-400 text-[11px] mt-0.5">Start a future sprint below to trigger active tracking.</p>
                                    </div>
                                )}
                            </div>

                            {/* FUTURE SPRINTS */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Planned Sprints ({futureSprints.length})</h3>
                                {futureSprints.map(fs => {
                                    const collapsed = collapsedSprints[fs.id];
                                    const sprintTasks = tasksList.filter(t => t.sprintId === fs.id);
                                    return (
                                        <div key={fs.id} className="bg-white border border-blue-100/60 rounded-3xl p-5 shadow-xl shadow-blue-100/10">
                                            <div className="flex justify-between items-center mb-3">
                                                <button
                                                    onClick={() => handleToggleCollapseSprint(fs.id)}
                                                    className="flex items-center gap-2 text-gray-800 font-bold hover:text-blue-600 transition cursor-pointer"
                                                >
                                                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    <span>{fs.name}</span>
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                                        {sprintTasks.length} task{sprintTasks.length !== 1 ? 's' : ''}
                                                    </span>
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    {(isAdmin || isManager) && (
                                                        <>
                                                            {!activeSprint && (
                                                                <button
                                                                    onClick={() => handleStartSprint(fs.id)}
                                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer"
                                                                >
                                                                    <Play className="w-3 h-3 fill-white" />
                                                                    Start Sprint
                                                                </button>
                                                            )}
                                                            <button
                                                                    onClick={() => handleDeleteSprintClick(fs.id, fs.name)}
                                                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                                                                    title="Delete Sprint"
                                                            >
                                                                <AlertCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {!collapsed && (
                                                <div className="space-y-2 mt-3 pl-6">
                                                    {sprintTasks.map(t => (
                                                        <div key={t.id} className="p-3 bg-slate-50/50 hover:bg-blue-50/20 border border-slate-100 rounded-xl transition flex items-center justify-between text-xs">
                                                            <span className="font-semibold text-gray-705">{t.title}</span>
                                                            <select
                                                                onChange={(e) => handleMoveTaskToSprint(t.id, e.target.value)}
                                                                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] focus:outline-none"
                                                                value={fs.id.toString()}
                                                            >
                                                                <option value={fs.id}>Relocate...</option>
                                                                <option value="">Move to Backlog</option>
                                                                {activeSprint && <option value={activeSprint.id}>Move to Active Sprint</option>}
                                                                {futureSprints.filter(x => x.id !== fs.id).map(x => (
                                                                    <option key={x.id} value={x.id}>Move to {x.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                    {sprintTasks.length === 0 && (
                                                        <p className="text-gray-400 italic text-[11px] py-2">No tasks assigned. Move backlog tasks here.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {futureSprints.length === 0 && (
                                    <p className="text-gray-400 italic text-xs py-4 text-center">No future sprints planned.</p>
                                )}
                            </div>
                        </div>

                        {/* Right column: Backlog directory */}
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-blue-100/60 rounded-3xl p-5 shadow-xl shadow-blue-100/10 space-y-4">
                                <div className="border-b border-gray-100 pb-3">
                                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <ClipboardList className="w-4 h-4 text-blue-600" />
                                        Project Backlog ({backlogTasks.length})
                                    </h2>
                                    <div className="relative mt-2">
                                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={taskSearch}
                                            onChange={(e) => setTaskSearch(e.target.value)}
                                            placeholder="Search backlog..."
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] focus:outline-none focus:bg-white focus:border-blue-500 transition text-gray-800"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                                    {backlogTasks.map(t => (
                                        <div key={t.id} className="p-3 bg-slate-50/60 border border-slate-100 rounded-2xl hover:shadow-sm hover:bg-blue-50/10 transition flex flex-col justify-between gap-2.5">
                                            <div>
                                                <span className="font-bold text-gray-800 text-xs block leading-snug">{t.title}</span>
                                                <span className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 ${
                                                    t.priority === 'high' ? 'bg-rose-50 text-rose-600' :
                                                    t.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                } uppercase tracking-wider`}>
                                                    {t.priority}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-dashed border-gray-100 pt-2 text-[10px]">
                                                <span className="text-gray-400 font-medium">Assign to:</span>
                                                <select
                                                    onChange={(e) => handleMoveTaskToSprint(t.id, e.target.value)}
                                                    className="bg-white border border-gray-200 rounded-lg py-0.5 px-1.5 focus:outline-none font-bold text-gray-700"
                                                    value=""
                                                >
                                                    <option value="">Choose Sprint...</option>
                                                    {activeSprint && <option value={activeSprint.id}>{activeSprint.name} (Active)</option>}
                                                    {futureSprints.map(fs => (
                                                        <option key={fs.id} value={fs.id}>{fs.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}

                                    {backlogTasks.length === 0 && (
                                        <p className="text-gray-400 italic text-center py-10 text-xs">Backlog is empty.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* CREATE SPRINT MODAL */}
            {sprintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
                    <div className="bg-white rounded-3xl border border-blue-100 shadow-2xl p-6 w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Calendar className="text-blue-600 w-5 h-5" />
                                Create Planned Sprint
                            </h3>
                            <button
                                onClick={() => setSprintModalOpen(false)}
                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSprint} className="mt-4 space-y-4">
                            {/* Sprint Name */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sprint Title</label>
                                <input
                                    type="text"
                                    required
                                    value={sprintForm.name}
                                    onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                                    placeholder="e.g. Sprint 1 - Core Backend, Sprint 2"
                                    className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800 font-semibold"
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                                    <input
                                        type="date"
                                        value={sprintForm.startDate}
                                        onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                                    <input
                                        type="date"
                                        value={sprintForm.endDate}
                                        onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Goal */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sprint Goal</label>
                                <textarea
                                    value={sprintForm.goal}
                                    onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                                    placeholder="Define what this sprint will achieve"
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                />
                            </div>

                            {/* Submit & Cancel */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setSprintModalOpen(false)}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingSprint}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
                                >
                                    {submittingSprint ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Sprint'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
