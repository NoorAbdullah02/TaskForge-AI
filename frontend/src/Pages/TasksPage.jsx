import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, updateTask } from '../Services/taskApi';
import { getProjects } from '../Services/projectApi';
import TaskModal from '../Components/TaskModal';
import KanbanBoard from '../Components/KanbanBoard';

import {
    CheckSquare,
    Plus,
    LayoutGrid,
    List,
    Filter,
    Calendar,
    AlertCircle,
    Loader,
    Trophy,
    ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const TasksPage = () => {
    const { isLoggedIn, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'

    // Filters
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Modal Control
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const navigate = useNavigate();

    // Redirect if unauthorized
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    const fetchFiltersData = async () => {
        try {
            const projectsList = await getProjects();
            setProjects(projectsList);
        } catch (error) {
            console.error('Error fetching projects list:', error);
        }
    };

    const fetchTasksList = async () => {
        try {
            setIsLoading(true);
            const params = {};
            if (selectedProject) params.projectId = selectedProject;
            if (selectedStatus) params.status = selectedStatus;
            if (selectedPriority) params.priority = selectedPriority;

            const data = await getTasks(params);
            setTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Failed to load tasks list');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchFiltersData();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchTasksList();
        }
    }, [isLoggedIn, selectedProject, selectedStatus, selectedPriority]);

    const handleTaskSaved = () => {
        fetchTasksList();
        setEditingTask(null);
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            await updateTask(taskId, { status: newStatus });
            toast.success('Task status updated');
            fetchTasksList();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading tasks workspace...</p>
                </div>
            </div>
        );
    }

    const statusStates = ['backlog', 'todo', 'in-progress', 'review', 'done'];
    const statusTitles = {
        backlog: 'Backlog',
        todo: 'To Do',
        'in-progress': 'In Progress',
        review: 'In Review',
        done: 'Completed'
    };

    const priorityColors = {
        low: 'bg-gray-100 text-gray-800 border-gray-200',
        medium: 'bg-blue-50 text-blue-700 border-blue-100',
        high: 'bg-orange-50 text-orange-700 border-orange-100',
        critical: 'bg-red-50 text-red-750 border-red-200'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                            <CheckSquare className="w-10 h-10 text-blue-600" />
                            Task Workspace
                        </h1>
                        <p className="text-gray-600 font-medium">Manage and organize all task deliverables across workspaces.</p>
                    </div>

                    <button
                        onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Task
                    </button>
                </div>

                {/* Filters & View Toggles */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <span className="text-xs font-extrabold uppercase text-gray-500 flex items-center gap-1.5">
                            <Filter className="w-4 h-4" /> Filters:
                        </span>

                        {/* Project selector */}
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="px-3 py-2 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white"
                        >
                            <option value="">All Projects</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        {/* Priority Selector */}
                        <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            className="px-3 py-2 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white"
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="critical">Critical</option>
                        </select>

                        {/* Status selector */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="px-3 py-2 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white"
                        >
                            <option value="">All Statuses</option>
                            {statusStates.map((st) => (
                                <option key={st} value={st}>{statusTitles[st]}</option>
                            ))}
                        </select>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl self-end md:self-auto">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                                viewMode === 'kanban'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Board
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                                viewMode === 'list'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <List className="w-4 h-4" />
                            List
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                {tasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow border border-gray-100 max-w-xl mx-auto mt-12">
                        <CheckSquare className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No tasks found</h3>
                        <p className="text-gray-500 mb-6 font-medium">Modify your filters or create a new task to get started.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition"
                        >
                            Add Task
                        </button>
                    </div>
                ) : viewMode === 'kanban' ? (
                    /* KANBAN BOARD VIEW WITH DRAG & DROP */
                    <KanbanBoard
                        tasks={tasks}
                        setTasks={setTasks}
                        onCardClick={(id) => navigate(`/tasks/${id}`)}
                        priorityColors={priorityColors}
                        statusStates={statusStates}
                        statusTitles={statusTitles}
                    />
                ) : (
                    /* LIST VIEW */
                    <div className="bg-white rounded-3xl shadow border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold text-gray-700 text-xs uppercase tracking-wider">Task</th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-700 text-xs uppercase tracking-wider">Project</th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-700 text-xs uppercase tracking-wider">Priority</th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-700 text-xs uppercase tracking-wider">Due Date</th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((t) => (
                                        <tr
                                            key={t.id}
                                            onClick={() => navigate(`/tasks/${t.id}`)}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-bold text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    {t.isMilestone && <Trophy className="w-4 h-4 text-yellow-500" />}
                                                    <span>{t.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-semibold text-sm">{t.projectName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-750 border border-gray-200 uppercase">
                                                    {statusTitles[t.status]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-extrabold uppercase border ${priorityColors[t.priority] || priorityColors.medium}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-sm font-semibold">
                                                {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No deadline'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-extrabold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button
                                                        onClick={() => navigate(`/tasks/${t.id}`)}
                                                        className="text-indigo-600 hover:text-indigo-850 text-xs font-extrabold flex items-center gap-0.5"
                                                    >
                                                        Details <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Add/Edit Task Modal */}
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    task={editingTask}
                    onTaskSaved={handleTaskSaved}
                />
            </div>
        </div>
    );
};

export default TasksPage;
