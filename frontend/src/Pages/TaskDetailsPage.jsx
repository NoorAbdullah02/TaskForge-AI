import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageKitUpload from '../Components/ImageKitUpload';
import {
    getTaskDetails,
    updateTask,
    deleteTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    createComment,
    deleteComment,
    createAttachment,
    deleteAttachment
} from '../Services/taskApi';
import TaskModal from '../Components/TaskModal';
import {
    Loader,
    Calendar,
    ArrowLeft,
    CheckSquare,
    AlertCircle,
    User,
    FolderKanban,
    Trophy,
    Trash2,
    MessageSquare,
    Paperclip,
    Plus,
    CheckCircle,
    Circle,
    Download,
    Eye,
    Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';

const TaskDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, loading: authLoading } = useAuth();

    const [task, setTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Subtask input state
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [addingSubtask, setAddingSubtask] = useState(false);

    // Comment input state
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Attachment input state
    const [fileName, setFileName] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [fileType, setFileType] = useState('');
    const [addingAttachment, setAddingAttachment] = useState(false);

    // Edit modal control
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Redirect if unauthorized
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    const fetchDetails = async () => {
        try {
            setIsLoading(true);
            const data = await getTaskDetails(id);
            setTask(data);
        } catch (error) {
            console.error('Error loading task:', error);
            toast.error('Failed to load task details');
            navigate('/tasks');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn && id) {
            fetchDetails();
        }
    }, [isLoggedIn, id]);

    // Handle status change directly
    const handleStatusChange = async (newStatus) => {
        try {
            await updateTask(id, { status: newStatus });
            toast.success('Status updated');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    // Handle task deletion
    const handleDeleteTask = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this task?')) return;
        try {
            await deleteTask(id);
            toast.success('Task deleted successfully');
            navigate('/tasks');
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    // ==========================================
    // SUBTASK OPERATIONS
    // ==========================================
    const handleAddSubtask = async (e) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        try {
            setAddingSubtask(true);
            await createSubtask(id, newSubtaskTitle.trim());
            toast.success('Checklist item added');
            setNewSubtaskTitle('');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to add checklist item');
        } finally {
            setAddingSubtask(false);
        }
    };

    const handleToggleSubtask = async (subtaskId, isCompleted) => {
        try {
            await updateSubtask(id, subtaskId, { isCompleted: !isCompleted });
            fetchDetails();
        } catch (error) {
            toast.error('Failed to update checklist item');
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        try {
            await deleteSubtask(id, subtaskId);
            toast.success('Checklist item deleted');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to delete checklist item');
        }
    };

    // ==========================================
    // COMMENT OPERATIONS
    // ==========================================
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setPostingComment(true);
            await createComment(id, newComment.trim());
            toast.success('Comment posted');
            setNewComment('');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to post comment');
        } finally {
            setPostingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await deleteComment(id, commentId);
            toast.success('Comment deleted');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to delete comment');
        }
    };

    // ==========================================
    // ATTACHMENT OPERATIONS
    // ==========================================
    const handleAddAttachment = async (e) => {
        e.preventDefault();
        if (!fileName.trim() || !fileUrl.trim()) return;

        try {
            setAddingAttachment(true);
            await createAttachment(id, {
                fileName: fileName.trim(),
                fileUrl: fileUrl.trim(),
                fileType: fileType.trim() || undefined,
            });
            toast.success('Attachment linked successfully');
            setFileName('');
            setFileUrl('');
            setFileType('');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to add attachment');
        } finally {
            setAddingAttachment(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        try {
            await deleteAttachment(id, attachmentId);
            toast.success('Attachment removed');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to remove attachment');
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading task deliverables...</p>
                </div>
            </div>
        );
    }

    const priorityColors = {
        low: 'bg-gray-150 text-gray-700',
        medium: 'bg-blue-100 text-blue-800',
        high: 'bg-orange-100 text-orange-800',
        critical: 'bg-red-100 text-red-800'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-6 transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Tasks
                </button>

                {/* Main details layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Task summary info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>

                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${priorityColors[task.priority]}`}>
                                        {task.priority} Priority
                                    </span>
                                    {task.isMilestone && (
                                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                            <Trophy className="w-4.5 h-4.5 text-yellow-600" /> Milestone
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600 hover:text-blue-600 flex items-center gap-1.5 font-bold text-xs"
                                    >
                                        <Edit2 className="w-4 h-4" /> Edit Task
                                    </button>
                                    <button
                                        onClick={handleDeleteTask}
                                        className="p-2 hover:bg-red-50 rounded-xl transition text-gray-400 hover:text-red-600 flex items-center gap-1.5 font-bold text-xs"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Task
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-800">{task.title}</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-gray-400 font-bold uppercase">Associated Project:</span>
                                    <Link to={`/projects/${task.projectId}`} className="text-sm font-extrabold text-blue-600 hover:underline">
                                        {task.project?.name}
                                    </Link>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Description</h3>
                                <p className="text-gray-600 font-medium leading-relaxed">
                                    {task.description || 'No description provided for this task.'}
                                </p>
                            </div>
                        </div>

                        {/* Checklist (Subtasks) */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <CheckSquare className="w-6 h-6 text-blue-500" />
                                    Checklist / Subtasks
                                </h3>
                                <p className="text-xs text-gray-500 font-semibold mt-1">Break down task steps into actionable checklist milestones.</p>
                            </div>

                            {/* Add checklist input */}
                            <form onSubmit={handleAddSubtask} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    placeholder="Add new subtask item..."
                                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-semibold"
                                />
                                <button
                                    type="submit"
                                    disabled={addingSubtask || !newSubtaskTitle.trim()}
                                    className="px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition"
                                >
                                    Add
                                </button>
                            </form>

                            {/* Subtask items list */}
                            {task.subtasks.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-4 font-semibold">No checklist subtasks defined.</p>
                            ) : (
                                <div className="space-y-3">
                                    {task.subtasks.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                sub.isCompleted ? 'bg-green-50/20 border-green-100' : 'bg-gray-50/50 border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleSubtask(sub.id, sub.isCompleted)}
                                                    className={`p-1.5 rounded-full transition ${
                                                        sub.isCompleted ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-blue-500'
                                                    }`}
                                                >
                                                    {sub.isCompleted ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                </button>
                                                <span className={`font-semibold text-sm ${sub.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                    {sub.title}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteSubtask(sub.id)}
                                                className="text-gray-400 hover:text-red-600 transition p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comments Thread */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <MessageSquare className="w-6 h-6 text-indigo-500" />
                                    Comments Thread
                                </h3>
                                <p className="text-xs text-gray-500 font-semibold mt-1">Discuss work details or give progress updates.</p>
                            </div>

                            {/* List comments */}
                            <div className="space-y-4">
                                {task.comments.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-4 font-semibold">No discussions posted yet.</p>
                                ) : (
                                    task.comments.map((com) => (
                                        <div key={com.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-2 relative group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-indigo-600 text-white text-xxs font-bold rounded-full flex items-center justify-center">
                                                        {com.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-extrabold text-xs text-gray-700">{com.userName}</span>
                                                    <span className="text-xxs text-gray-400 font-semibold">
                                                        {new Date(com.createdAt).toLocaleString()}
                                                    </span>
                                                </div>

                                                {com.userId === user.id && (
                                                    <button
                                                        onClick={() => handleDeleteComment(com.id)}
                                                        className="text-gray-400 hover:text-red-600 transition p-1 absolute top-3 right-3 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-650 font-medium whitespace-pre-wrap">{com.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add comment form */}
                            <form onSubmit={handleAddComment} className="space-y-3 pt-2">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-sm text-gray-700"
                                    required
                                ></textarea>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={postingComment || !newComment.trim()}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
                                    >
                                        Post Comment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right: Meta Information Panel */}
                    <div className="space-y-6">
                        {/* Task parameters */}
                        <div className="bg-white rounded-3xl p-6 shadow border border-gray-100 space-y-6">
                            <h3 className="text-xl font-bold text-gray-800">Task Information</h3>

                            <div className="space-y-5">
                                {/* Status */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                                    <select
                                        value={task.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white"
                                    >
                                        <option value="backlog">Backlog</option>
                                        <option value="todo">To Do</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="review">In Review</option>
                                        <option value="done">Completed</option>
                                    </select>
                                </div>

                                {/* Assignee */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assignee</label>
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <User className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="font-extrabold text-sm text-gray-800">
                                                {task.assignee ? task.assignee.name : 'Unassigned'}
                                            </p>
                                            <p className="text-xxs text-gray-400 font-semibold">
                                                {task.assignee ? task.assignee.email : 'No owner'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Due date */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Due Date</label>
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-800">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* File Attachments */}
                        <div className="bg-white rounded-3xl p-6 shadow border border-gray-100 space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Paperclip className="w-5 h-5 text-gray-500" />
                                Attachments
                            </h3>

                            {/* List attachments */}
                            <div className="space-y-3">
                                {task.attachments.length === 0 ? (
                                    <p className="text-gray-400 text-xs font-semibold">No attachments uploaded.</p>
                                ) : (
                                    task.attachments.map((att) => (
                                        <div key={att.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-150">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                                                <a
                                                    href={att.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-bold text-xs text-blue-650 hover:underline truncate"
                                                >
                                                    {att.fileName}
                                                </a>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteAttachment(att.id)}
                                                className="text-gray-400 hover:text-red-600 transition p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add attachment form using ImageKitUpload */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <p className="text-xs font-extrabold text-gray-500 uppercase mb-1">Upload New File</p>
                                <ImageKitUpload
                                    folder="attachments"
                                    onUploadSuccess={async (fileDetails) => {
                                        try {
                                            setAddingAttachment(true);
                                            await createAttachment(id, {
                                                fileName: fileDetails.fileName,
                                                fileUrl: fileDetails.fileUrl,
                                                fileType: fileDetails.fileType || undefined,
                                            });
                                            toast.success('Attachment uploaded successfully');
                                            fetchDetails();
                                        } catch (error) {
                                            toast.error('Failed to save attachment to task');
                                        } finally {
                                            setAddingAttachment(false);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Task Modal */}
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
