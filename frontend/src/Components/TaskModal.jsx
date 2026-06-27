import { useState, useEffect } from 'react';
import { X, CheckSquare, Loader, Calendar, AlignLeft, User, AlertCircle, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjects, getProjectDetails } from '../Services/projectApi';
import { createTask, updateTask } from '../Services/taskApi';

const TaskModal = ({ isOpen, onClose, task = null, onTaskSaved }) => {
    const [projectsList, setProjectsList] = useState([]);
    const [membersList, setMembersList] = useState([]);
    const [projectId, setProjectId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('todo');
    const [priority, setPriority] = useState('medium');
    const [assigneeId, setAssigneeId] = useState('');
    const [isMilestone, setIsMilestone] = useState(false);
    const [dueDate, setDueDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(false);
    const [fetchingMembers, setFetchingMembers] = useState(false);

    // Fetch projects list when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchProjects = async () => {
                try {
                    setFetchingProjects(true);
                    const data = await getProjects();
                    setProjectsList(data);

                    // Populate fields if editing
                    if (task) {
                        setProjectId(task.projectId);
                        setTitle(task.title);
                        setDescription(task.description || '');
                        setStatus(task.status);
                        setPriority(task.priority);
                        setAssigneeId(task.assigneeId || '');
                        setIsMilestone(task.isMilestone);
                        setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
                    } else {
                        // Pre-select first project if available
                        if (data.length > 0) {
                            setProjectId(data[0].id);
                        }
                    }
                } catch (error) {
                    toast.error('Failed to load projects list');
                } finally {
                    setFetchingProjects(false);
                }
            };
            fetchProjects();
        }
    }, [isOpen, task]);

    // Fetch project members whenever projectId changes
    useEffect(() => {
        if (projectId) {
            const fetchMembers = async () => {
                try {
                    setFetchingMembers(true);
                    const data = await getProjectDetails(projectId);
                    setMembersList(data.members || []);
                } catch (error) {
                    console.error('Error fetching members:', error);
                } finally {
                    setFetchingMembers(false);
                }
            };
            fetchMembers();
        } else {
            setMembersList([]);
        }
    }, [projectId]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error('Task title is required');
            return;
        }

        if (!projectId) {
            toast.error('Project selection is required');
            return;
        }

        try {
            setIsLoading(true);
            const payload = {
                projectId: parseInt(projectId, 10),
                title: title.trim(),
                description: description.trim() || undefined,
                status,
                priority,
                assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
                isMilestone,
                dueDate: dueDate || undefined,
            };

            let data;
            if (task) {
                data = await updateTask(task.id, payload);
                toast.success('Task updated successfully! 📝');
            } else {
                data = await createTask(payload);
                toast.success('Task created successfully! 🚀');
            }

            onTaskSaved(data.task);
            onClose();
        } catch (error) {
            console.error('Save task error:', error);
            toast.error(error?.response?.data?.message || 'Failed to save task');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white/95 rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full border border-gray-100 relative overflow-hidden backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <CheckSquare className="w-7 h-7 text-blue-600 animate-pulse" />
                        {task ? 'Edit Task' : 'Create Task'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    {/* Project Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Project Workspace</label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            disabled={fetchingProjects || !!task}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-bold text-gray-700 bg-white"
                        >
                            {fetchingProjects ? (
                                <option>Loading projects...</option>
                            ) : (
                                projectsList.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Description</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the task instructions..."
                                rows={2}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-gray-700"
                            ></textarea>
                        </div>
                    </div>

                    {/* Dropdowns row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-bold text-gray-700 bg-white"
                            >
                                <option value="backlog">Backlog</option>
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="review">In Review</option>
                                <option value="done">Completed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-bold text-gray-700 bg-white"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="critical">Critical Priority</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignee & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Assignee</label>
                            <select
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                disabled={fetchingMembers}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-bold text-gray-700 bg-white"
                            >
                                <option value="">Unassigned</option>
                                {membersList.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Due Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Milestone check */}
                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700">
                            <input
                                type="checkbox"
                                checked={isMilestone}
                                onChange={(e) => setIsMilestone(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Flag as key Project Milestone
                        </label>
                    </div>

                    {/* Submit Section */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-2xl hover:bg-gray-200 transition font-bold text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !title.trim() || !projectId}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition font-bold text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                task ? 'Save Changes' : 'Create Task'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
