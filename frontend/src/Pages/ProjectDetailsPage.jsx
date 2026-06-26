import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getProjectDetails,
    updateProject,
    deleteProject,
    assignMember,
    removeMember,
    createTask,
    updateTask,
    deleteTask,
    getProjectDocuments,
    addProjectDocument,
    deleteProjectDocument
} from '../Services/projectApi';
import ImageKitUpload from '../Components/ImageKitUpload';
import { predictProjectSuccess, predictDeadline } from '../Services/aiApi';
import { getVersions, addVersion, trackDownload, getDownloads } from '../Services/fileApi';
import { socket } from '../Services/socket';



import {
    Loader,
    Calendar,
    Users,
    Settings,
    CheckSquare,
    Trophy,
    Trash2,
    Plus,
    UserPlus,
    CheckCircle,
    Circle,
    Info,
    LayoutGrid,
    ArrowLeft,
    Check,
    FileText,
    Paperclip,
    HelpCircle,
    Megaphone,
    FileImage,
    Brain
} from 'lucide-react';
import toast from 'react-hot-toast';

const WORK_TYPE_ICONS = {
    task: { icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-105' },
    request: { icon: HelpCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-105' },
    campaign: { icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-105' },
    candidate: { icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-150' },
    asset: { icon: FileImage, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-105' },
};

const ProjectDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, loading: authLoading } = useAuth();

    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);

    // Advanced File Versioning & Downloads tracking states
    const [versionsOpen, setVersionsOpen] = useState({});
    const [versionHistory, setVersionHistory] = useState({});
    const [downloadsOpen, setDownloadsOpen] = useState({});
    const [downloadHistory, setDownloadHistory] = useState({});
    const [newVersionOpen, setNewVersionOpen] = useState({});


    // Forms states
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [isInviting, setIsInviting] = useState(false);

    // New task states
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskPriority, setTaskPriority] = useState('medium');
    const [taskAssignee, setTaskAssignee] = useState('');
    const [taskIsMilestone, setTaskIsMilestone] = useState(false);
    const [taskDueDate, setTaskDueDate] = useState('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [taskWorkType, setTaskWorkType] = useState('task');

    // Edit project state
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editStatus, setEditStatus] = useState('planning');
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [isSavingProject, setIsSavingProject] = useState(false);

    // Redirect if unauthorized
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    const [successPrediction, setSuccessPrediction] = useState(null);
    const [deadlinePrediction, setDeadlinePrediction] = useState(null);

    const fetchDetails = async () => {
        try {
            setIsLoading(true);

            const data = await getProjectDetails(id);
            setProject(data);
            if (data.workTypes) {
                setTaskWorkType(data.workTypes.split(',')[0]);
            }

            // Populate settings inputs
            setEditName(data.name);
            setEditDesc(data.description || '');
            setEditStatus(data.status);
            setEditStart(data.startDate ? data.startDate.split('T')[0] : '');
            setEditEnd(data.endDate ? data.endDate.split('T')[0] : '');

            // Fetch AI Predictions
            try {
                const success = await predictProjectSuccess(id);
                setSuccessPrediction(success);
            } catch (err) {
                console.error('Failed to predict project success:', err);
            }

            try {
                const dl = await predictDeadline('project', id);
                setDeadlinePrediction(dl);
            } catch (err) {
                console.error('Failed to predict project deadline:', err);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            const msg = error?.response?.data?.message || 'Access denied / Project not found';
            toast.error(msg);
            navigate('/projects');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            setDocsLoading(true);
            const data = await getProjectDocuments(id);
            setDocuments(data);
        } catch (err) {
            console.error('Error fetching project documents:', err);
        } finally {
            setDocsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn && id) {
            fetchDetails();
        }
    }, [isLoggedIn, id]);

    useEffect(() => {
        if (isLoggedIn && id && activeTab === 'documents') {
            fetchDocuments();
        }
    }, [isLoggedIn, id, activeTab]);

    useEffect(() => {
        if (!isLoggedIn || !id) return;

        const handleProjectUpdated = (data) => {
            if (parseInt(data.projectId) === parseInt(id)) {
                if (data.action === 'deleted') {
                    toast.error('This project has been deleted');
                    navigate('/projects');
                } else {
                    fetchDetails();
                }
            }
        };

        const handleTaskUpdated = (data) => {
            if (parseInt(data.projectId) === parseInt(id)) {
                fetchDetails();
            }
        };

        const handleSprintUpdated = (data) => {
            if (parseInt(data.projectId) === parseInt(id)) {
                fetchDetails();
            }
        };

        const handleEpicUpdated = (data) => {
            if (parseInt(data.projectId) === parseInt(id)) {
                fetchDetails();
            }
        };

        const handleStoryUpdated = (data) => {
            // story updates might affect backlog / epic views, so refresh details
            fetchDetails();
        };

        socket.on('project_updated', handleProjectUpdated);
        socket.on('task_updated', handleTaskUpdated);
        socket.on('sprint_updated', handleSprintUpdated);
        socket.on('epic_updated', handleEpicUpdated);
        socket.on('story_updated', handleStoryUpdated);

        return () => {
            socket.off('project_updated', handleProjectUpdated);
            socket.off('task_updated', handleTaskUpdated);
            socket.off('sprint_updated', handleSprintUpdated);
            socket.off('epic_updated', handleEpicUpdated);
            socket.off('story_updated', handleStoryUpdated);
        };
    }, [isLoggedIn, id]);



    // Handle Project update
    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            setIsSavingProject(true);
            await updateProject(id, {
                name: editName.trim(),
                description: editDesc.trim(),
                status: editStatus,
                startDate: editStart || null,
                endDate: editEnd || null,
            });
            toast.success('Project details updated successfully');
            fetchDetails();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update project');
        } finally {
            setIsSavingProject(false);
        }
    };

    // Handle Project delete
    const handleDeleteProject = async () => {
        if (!window.confirm('Are you absolutely sure you want to delete this project? This will delete all tasks and milestones.')) {
            return;
        }
        try {
            await deleteProject(id);
            toast.success('Project deleted successfully');
            navigate('/projects');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete project');
        }
    };

    // Handle member assignment
    const handleInviteMember = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        try {
            setIsInviting(true);
            await assignMember(id, { email: inviteEmail.trim(), role: inviteRole });
            toast.success('Member assigned to project! 👥');
            setInviteEmail('');
            fetchDetails();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to invite member');
        } finally {
            setIsInviting(false);
        }
    };

    // Handle member removal
    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Remove this member from the project?')) return;
        try {
            await removeMember(id, userId);
            toast.success('Member removed successfully');
            fetchDetails();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to remove member');
        }
    };

    // Handle task creation
    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;

        try {
            setIsCreatingTask(true);
            await createTask(id, {
                title: taskTitle.trim(),
                description: taskDesc.trim() || undefined,
                priority: taskPriority,
                assigneeId: taskAssignee || undefined,
                isMilestone: taskIsMilestone,
                dueDate: taskDueDate || undefined,
                workType: taskWorkType,
            });
            toast.success(taskIsMilestone ? 'Milestone created! 🏆' : 'Task added successfully! ✅');
            setTaskTitle('');
            setTaskDesc('');
            setTaskAssignee('');
            setTaskIsMilestone(false);
            setTaskDueDate('');
            setTaskWorkType(project.workTypes ? project.workTypes.split(',')[0] : 'task');
            fetchDetails();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to create task');
        } finally {
            setIsCreatingTask(false);
        }
    };

    // Handle task status update
    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            await updateTask(id, taskId, { status: newStatus });
            toast.success('Task status updated');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to update task status');
        }
    };

    // Handle task delete
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await deleteTask(id, taskId);
            toast.success('Task deleted successfully');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading workspace details...</p>
                </div>
            </div>
        );
    }

    const currentMember = project.members.find((m) => m.id === user.id);
    const isOwner = currentMember?.role === 'owner';
    const isManager = currentMember?.role === 'manager' || isOwner;

    // Filter tasks
    const activeTasks = project.tasks.filter(t => !t.isMilestone);
    const milestones = project.tasks.filter(t => t.isMilestone);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Back Button & Header */}
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-6 transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Hub
                </button>

                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-indigo-100 text-indigo-800`}>
                                    {project.status}
                                </span>
                                <span className="text-xs font-bold text-gray-500">
                                    Role: {currentMember?.role.toUpperCase() || 'MEMBER'}
                                </span>
                                {successPrediction && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1 border ${
                                        successPrediction.risk_level === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                                        successPrediction.risk_level === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-red-50 text-red-700 border-red-200 animate-pulse'
                                    }`}>
                                        AI Success Rate: {successPrediction.success_probability}%
                                    </span>
                                )}
                                {deadlinePrediction && (
                                    <span className="bg-indigo-50 text-indigo-750 border border-indigo-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1">
                                        AI Est. End: {new Date(deadlinePrediction.predicted_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">{project.name}</h1>

                            <p className="text-gray-500 font-semibold mt-1">{project.description || 'No description provided.'}</p>
                        </div>

                        {/* Progress Meter */}
                        <div className="flex items-center gap-4 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-150">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completion</p>
                                <p className="text-3xl font-extrabold text-blue-600">{project.progress}%</p>
                            </div>
                            <div className="relative w-16 h-16 transform -rotate-90">
                                <svg className="w-16 h-16" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth="10"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 - (251.2 * project.progress) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mt-8 border-b border-gray-100 pb-2 overflow-x-auto">
                        {[
                            { id: 'overview', label: 'Overview', icon: Info },
                            { id: 'tasks', label: 'Tasks Board', icon: CheckSquare },
                            { id: 'milestones', label: 'Milestones', icon: Trophy },
                            { id: 'documents', label: 'Documents', icon: FileText },
                            { id: 'members', label: 'Members', icon: Users },
                            { id: 'intelligence', label: 'Project Intelligence', icon: Brain },
                            ...(isManager ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (tab.id === 'intelligence') {
                                            navigate(`/projects/${id}/intelligence`);
                                        } else {
                                            setActiveTab(tab.id);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab content */}
                <div className="space-y-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Project Description</h3>
                                    <p className="text-gray-650 font-medium leading-relaxed">
                                        {project.description || 'No description has been written for this project yet.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Start Date</p>
                                        <p className="font-bold text-gray-800 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Unscheduled'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">End Target</p>
                                        <p className="font-bold text-gray-800 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-pink-500" />
                                            {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Unscheduled'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-white rounded-3xl p-6 shadow border border-gray-100 space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">Workspace Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-gray-500 font-semibold">Total Members</span>
                                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            {project.members.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-gray-500 font-semibold">Tasks Pending</span>
                                        <span className="font-bold text-yellow-600">
                                            {activeTasks.filter(t => t.status !== 'done').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-gray-500 font-semibold">Tasks Completed</span>
                                        <span className="font-bold text-green-600">
                                            {activeTasks.filter(t => t.status === 'done').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-semibold">Milestones Reached</span>
                                        <span className="font-bold text-blue-600">
                                            {milestones.filter(t => t.status === 'done').length} / {milestones.length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TASKS TAB (Board View) */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-6">
                            {/* Create Task Form */}
                            <div className="bg-white rounded-3xl p-6 shadow border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-blue-500" />
                                    Add New Task or Milestone
                                </h3>
                                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 space-y-3">
                                        <input
                                            type="text"
                                            value={taskTitle}
                                            onChange={(e) => setTaskTitle(e.target.value)}
                                            placeholder="Task title..."
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-semibold"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={taskDesc}
                                            onChange={(e) => setTaskDesc(e.target.value)}
                                            placeholder="Task description (optional)..."
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-medium"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <select
                                                value={taskWorkType}
                                                onChange={(e) => setTaskWorkType(e.target.value)}
                                                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white"
                                            >
                                                {project.workTypes ? project.workTypes.split(',').map((type) => (
                                                    <option key={type} value={type}>
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </option>
                                                )) : (
                                                    <option value="task">Task</option>
                                                )}
                                            </select>

                                            <select
                                                value={taskPriority}
                                                onChange={(e) => setTaskPriority(e.target.value)}
                                                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white"
                                            >
                                                <option value="low">Low Priority</option>
                                                <option value="medium">Medium Priority</option>
                                                <option value="high">High Priority</option>
                                                <option value="critical">Critical</option>
                                            </select>

                                            <select
                                                value={taskAssignee}
                                                onChange={(e) => setTaskAssignee(e.target.value)}
                                                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white"
                                            >
                                                <option value="">Unassigned</option>
                                                {project.members.map((m) => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="date"
                                                value={taskDueDate}
                                                onChange={(e) => setTaskDueDate(e.target.value)}
                                                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-750 bg-white"
                                            />
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border-2 border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={taskIsMilestone}
                                                    onChange={(e) => setTaskIsMilestone(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                Milestone?
                                            </label>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isCreatingTask || !taskTitle.trim()}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
                                        >
                                            Add Item
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Kanban Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {['todo', 'in-progress', 'done'].map((columnStatus) => {
                                    const columnTasks = activeTasks.filter(t => t.status === columnStatus);
                                    const colHeaderTitles = {
                                        todo: 'To Do',
                                        'in-progress': 'In Progress',
                                        done: 'Completed'
                                    };

                                    return (
                                        <div key={columnStatus} className="bg-gray-50 rounded-3xl p-4 border border-gray-200/50 min-h-[400px]">
                                            <div className="flex justify-between items-center mb-4 px-2">
                                                <h4 className="font-extrabold text-gray-700 uppercase tracking-wide text-sm">{colHeaderTitles[columnStatus]}</h4>
                                                <span className="bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full text-xs">
                                                    {columnTasks.length}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {columnTasks.map((t) => {
                                                    const workTypeInfo = WORK_TYPE_ICONS[t.workType] || WORK_TYPE_ICONS.task;
                                                    const WorkTypeIcon = workTypeInfo.icon;
                                                    return (
                                                        <div
                                                            key={t.id}
                                                            onClick={() => navigate(`/tasks/${t.id}`)}
                                                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-150 space-y-3 relative group hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                                                        >
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div className="flex items-start gap-2">
                                                                    <div className={`p-1.5 rounded-lg border shrink-0 ${workTypeInfo.bg}`}>
                                                                        <WorkTypeIcon className={`w-3.5 h-3.5 ${workTypeInfo.color}`} />
                                                                    </div>
                                                                    <h5 className="font-bold text-gray-800 line-clamp-2 pr-6">{t.title}</h5>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(t.id);
                                                                    }}
                                                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                        {t.description && (
                                                            <p className="text-xs text-gray-500 font-medium">{t.description}</p>
                                                        )}

                                                        <div className="flex justify-between items-center pt-2 text-xs">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                                                                    t.priority === 'high' || t.priority === 'critical' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {t.priority}
                                                                </span>
                                                                {t.assigneeName && (
                                                                    <span className="bg-blue-50 text-blue-750 font-bold px-2 py-0.5 rounded-full text-xxs flex items-center gap-1 border border-blue-100">
                                                                        👤 {t.assigneeName}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {t.dueDate && (
                                                                <span className="text-gray-400 font-semibold">
                                                                    Due: {new Date(t.dueDate).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Status Mover Dropdown */}
                                                        <div className="pt-2 border-t border-gray-100 flex gap-2">
                                                            {columnStatus !== 'todo' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUpdateTaskStatus(t.id, columnStatus === 'done' ? 'in-progress' : 'todo');
                                                                    }}
                                                                    className="flex-1 py-1 px-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xxs rounded transition text-center"
                                                                >
                                                                    ◀ Back
                                                                </button>
                                                            )}
                                                            {columnStatus !== 'done' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUpdateTaskStatus(t.id, columnStatus === 'todo' ? 'in-progress' : 'done');
                                                                    }}
                                                                    className="flex-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xxs rounded transition text-center"
                                                                >
                                                                    Move Forward ▶
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )})}
                                                {columnTasks.length === 0 && (
                                                    <p className="text-center text-gray-400 text-xs py-8 font-medium">Empty column</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* MILESTONES TAB */}
                    {activeTab === 'milestones' && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Project Milestones</h3>
                                <p className="text-gray-500 font-semibold mt-1">List of key target milestones and deliverables.</p>
                            </div>

                            {milestones.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Trophy className="w-16 h-16 text-gray-250 mx-auto mb-3" />
                                    <p className="text-gray-400 font-bold">No milestones created yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {milestones.map((m) => (
                                        <div
                                            key={m.id}
                                            className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition ${
                                                m.status === 'done' ? 'bg-green-50/50 border-green-200' : 'bg-gray-50/50 border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleUpdateTaskStatus(m.id, m.status === 'done' ? 'todo' : 'done')}
                                                    className={`p-1.5 rounded-full transition ${
                                                        m.status === 'done' ? 'text-green-600 bg-green-100 hover:bg-green-200' : 'text-gray-400 hover:text-blue-600'
                                                    }`}
                                                >
                                                    {m.status === 'done' ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                                </button>
                                                <div>
                                                    <h4 className={`font-bold text-lg ${m.status === 'done' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                        {m.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 font-semibold">
                                                        {m.dueDate ? `Due target: ${new Date(m.dueDate).toLocaleDateString()}` : 'No deadline'}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteTask(m.id)}
                                                className="text-gray-400 hover:text-red-600 transition p-2"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MEMBERS TAB */}
                    {activeTab === 'members' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Members list */}
                            <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">Project Members</h3>
                                <div className="space-y-4">
                                    {project.members.map((member) => (
                                        <div key={member.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-150">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{member.name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
                                                    {member.role}
                                                </span>

                                                {isManager && member.id !== user.id && member.role !== 'owner' && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="text-gray-400 hover:text-red-600 transition p-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Invite section */}
                            {isManager && (
                                <div className="bg-white rounded-3xl p-6 shadow border border-gray-100 space-y-6">
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <UserPlus className="w-6 h-6 text-blue-600" />
                                        Assign Member
                                    </h3>
                                    <form onSubmit={handleInviteMember} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Member Email</label>
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                placeholder="user@example.com"
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-semibold"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Assign Role</label>
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value)}
                                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white"
                                            >
                                                <option value="member">Project Member</option>
                                                <option value="manager">Project Manager</option>
                                                <option value="viewer">Viewer / Guest</option>
                                            </select>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isInviting || !inviteEmail.trim()}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
                                        >
                                            {isInviting ? 'Assigning...' : 'Assign User'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && isManager && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Workspace Settings</h3>
                                <p className="text-gray-500 font-semibold mt-1">Configure project properties or manage deletion.</p>
                            </div>

                            <form onSubmit={handleUpdateProject} className="space-y-5 max-w-xl">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Project Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Description</label>
                                    <textarea
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-gray-700"
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2">Status</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white"
                                        >
                                            <option value="planning">Planning</option>
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="on-hold">On Hold</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={editStart}
                                            onChange={(e) => setEditStart(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-750 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2">End Target</label>
                                        <input
                                            type="date"
                                            value={editEnd}
                                            onChange={(e) => setEditEnd(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-750 bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSavingProject}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
                                    >
                                        {isSavingProject ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </form>

                            {/* Danger Zone */}
                            {isOwner && (
                                <div className="pt-8 border-t border-red-100 space-y-4">
                                    <h4 className="text-lg font-bold text-red-600">Danger Zone</h4>
                                    <div className="p-5 bg-red-50 rounded-2xl border border-red-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <p className="font-bold text-gray-800">Delete Project</p>
                                            <p className="text-xs text-gray-500 font-medium">Once deleted, all tasks, milestones, and project data are permanently deleted.</p>
                                        </div>
                                        <button
                                            onClick={handleDeleteProject}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow transition flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Project
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* DOCUMENTS TAB */}
                    {activeTab === 'documents' && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Project Documents</h3>
                                    <p className="text-gray-500 font-semibold mt-1">Upload and manage deliverables, plans, and files inside this project.</p>
                                </div>
                            </div>

                            {/* Uploader */}
                            <div className="max-w-xl">
                                <ImageKitUpload
                                    folder="project-docs"
                                    onUploadSuccess={async (fileDetails) => {
                                        try {
                                            await addProjectDocument(id, {
                                                fileName: fileDetails.fileName,
                                                fileUrl: fileDetails.fileUrl,
                                                fileSize: fileDetails.fileSize,
                                                fileType: fileDetails.fileType
                                            });
                                            toast.success('Document uploaded successfully');
                                            fetchDocuments();
                                        } catch (error) {
                                            toast.error('Failed to save document metadata');
                                        }
                                    }}
                                />
                            </div>

                            {/* Documents list */}
                            {docsLoading ? (
                                <div className="text-center py-12">
                                    <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                                    <p className="text-gray-500 font-semibold">Loading project files...</p>
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="bg-gray-50/50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 max-w-xl mx-auto my-6">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-bold">No documents uploaded yet</p>
                                    <p className="text-xs text-gray-400">Drag and drop files in the zone above to attach them to the workspace.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                                                        <Paperclip className="w-5 h-5" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <a
                                                            href={doc.fileUrl.split('#')[0]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={async () => {
                                                                try {
                                                                    await trackDownload(doc.id);
                                                                    if (downloadsOpen[doc.id]) {
                                                                        const updatedDownloads = await getDownloads(doc.id);
                                                                        setDownloadHistory(prev => ({ ...prev, [doc.id]: updatedDownloads }));
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to track download:', err);
                                                                }
                                                            }}
                                                            className="font-bold text-sm text-blue-650 hover:underline truncate block"
                                                        >
                                                            {doc.fileName}
                                                        </a>
                                                        <p className="text-xxs text-gray-400 font-semibold mt-0.5 uppercase">
                                                            {doc.fileSize ? `${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB` : ''} • {doc.fileType?.split('/')[1] || 'File'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const isOpen = !versionsOpen[doc.id];
                                                            setVersionsOpen(prev => ({ ...prev, [doc.id]: isOpen }));
                                                            if (isOpen) {
                                                                try {
                                                                    const updatedVersions = await getVersions(doc.id);
                                                                    setVersionHistory(prev => ({ ...prev, [doc.id]: updatedVersions }));
                                                                } catch (err) {
                                                                    console.error(err);
                                                                }
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-100 rounded-xl text-xxs font-extrabold text-gray-700 transition"
                                                    >
                                                        Versions
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const isOpen = !downloadsOpen[doc.id];
                                                            setDownloadsOpen(prev => ({ ...prev, [doc.id]: isOpen }));
                                                            if (isOpen) {
                                                                try {
                                                                    const updatedDownloads = await getDownloads(doc.id);
                                                                    setDownloadHistory(prev => ({ ...prev, [doc.id]: updatedDownloads }));
                                                                } catch (err) {
                                                                    console.error(err);
                                                                }
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-100 rounded-xl text-xxs font-extrabold text-gray-700 transition"
                                                    >
                                                        Download Logs
                                                    </button>
                                                    <button
                                                        onClick={() => setNewVersionOpen(prev => ({ ...prev, [doc.id]: !newVersionOpen[doc.id] }))}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xxs font-extrabold transition"
                                                    >
                                                        Upload New Version
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm('Delete this document?')) return;
                                                            try {
                                                                await deleteProjectDocument(id, doc.id);
                                                                toast.success('Document deleted');
                                                                fetchDocuments();
                                                            } catch (err) {
                                                                toast.error('Failed to delete document');
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-650 transition p-2 bg-white hover:bg-red-50 rounded-xl border border-gray-250 animate-in"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* In-line New Version Uploader */}
                                            {newVersionOpen[doc.id] && (
                                                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 space-y-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Upload Version Update</span>
                                                    <ImageKitUpload
                                                        folder="document-versions"
                                                        onUploadSuccess={async (fileDetails) => {
                                                            try {
                                                                await addVersion(doc.id, {
                                                                    fileName: fileDetails.fileName,
                                                                    fileUrl: fileDetails.fileUrl,
                                                                    fileSize: fileDetails.fileSize,
                                                                    fileType: fileDetails.fileType
                                                                });
                                                                toast.success('New version added!');
                                                                fetchDocuments();
                                                                // Refresh versions list if open
                                                                if (versionsOpen[doc.id]) {
                                                                    const updatedVersions = await getVersions(doc.id);
                                                                    setVersionHistory(prev => ({ ...prev, [doc.id]: updatedVersions }));
                                                                }
                                                                setNewVersionOpen(prev => ({ ...prev, [doc.id]: false }));
                                                            } catch (error) {
                                                                toast.error('Failed to update version');
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Version History List */}
                                            {versionsOpen[doc.id] && (
                                                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 space-y-2">
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Version History</span>
                                                    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                                        {versionHistory[doc.id]?.map((v, vIdx) => (
                                                            <div key={vIdx} className="py-2 flex justify-between items-center text-xxs font-semibold">
                                                                <div>
                                                                    <a href={v.fileUrl.split('#')[0]} target="_blank" rel="noopener noreferrer" className="font-extrabold text-blue-650 hover:underline">
                                                                        {v.fileName} (v{v.version})
                                                                    </a>
                                                                    <span className="text-gray-400 block text-[9px] mt-0.5">Uploaded on {new Date(v.createdAt).toLocaleString()}</span>
                                                                </div>
                                                                <span className="text-gray-500">by {v.creatorName || 'System'}</span>
                                                            </div>
                                                        ))}
                                                        {(!versionHistory[doc.id] || versionHistory[doc.id].length === 0) && (
                                                            <p className="text-xxs text-gray-400 py-2">No version history logged.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Download Logs */}
                                            {downloadsOpen[doc.id] && (
                                                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 space-y-2">
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Download Audit Logs</span>
                                                    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto font-mono text-[9px]">
                                                        {downloadHistory[doc.id]?.map((dl, dlIdx) => (
                                                            <div key={dlIdx} className="py-2 flex justify-between items-center text-slate-500">
                                                                <div>
                                                                    <span className="font-extrabold text-slate-700">{dl.userName}</span> ({dl.userEmail})
                                                                    <span className="text-[8px] text-gray-400 block mt-0.5">IP: {dl.ipAddress} • {dl.userAgent?.substring(0, 40)}...</span>
                                                                </div>
                                                                <span className="text-gray-400 text-right">{new Date(dl.downloadedAt).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        {(!downloadHistory[doc.id] || downloadHistory[doc.id].length === 0) && (
                                                            <p className="text-xxs text-gray-400 py-2">No download events tracked yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
