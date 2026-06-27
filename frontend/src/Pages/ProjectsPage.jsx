import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    getProjects, 
    getProjectsFiltered, 
    archiveProject, 
    restoreProject, 
    duplicateProject, 
    moveProject, 
    transferOwnership, 
    joinProject, 
    exportProjects, 
    importProjects 
} from '../Services/projectApi';
import { getWorkspaceMembers } from '../Services/workspaceApi';
import CreateProjectModal from '../Components/CreateProjectModal';
import { 
    FolderKanban, Plus, Calendar, Users, BarChart3, ArrowRight, Search, 
    SlidersHorizontal, Archive, RefreshCw, MoreVertical, Copy, FolderInput, 
    Download, Key, Shield, LogIn, ExternalLink, HelpCircle, X, Trash2, 
    Briefcase, ShieldAlert, Check, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { socket } from '../Services/socket';

const ProjectsPage = () => {
    const { isLoggedIn, loading: authLoading, user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 6, pages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const navigate = useNavigate();

    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [archivedFilter, setArchivedFilter] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Advanced Modals
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinForm, setJoinForm] = useState({ inviteCode: '', password: '' });
    const [joining, setJoining] = useState(false);

    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateName, setDuplicateName] = useState('');
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [duplicating, setDuplicating] = useState(false);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferTargetUserId, setTransferTargetUserId] = useState('');
    const [transferring, setTransferring] = useState(false);

    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [credentialsProject, setCredentialsProject] = useState(null);

    // Dropdown state
    const [menuOpenProjectId, setMenuOpenProjectId] = useState(null);
    const [workspaceMembersList, setWorkspaceMembersList] = useState([]);

    const isWorkspaceOwner = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'super_admin';

    // Redirect to login if unauthorized
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const params = {
                search: searchTerm || undefined,
                status: statusFilter || undefined,
                isArchived: archivedFilter ? 'true' : 'false',
                page: currentPage,
                limit: 6
            };
            const data = await getProjectsFiltered(params);
            if (data && data.projects) {
                setProjects(data.projects);
                setPagination(data.pagination);
            } else {
                setProjects(data || []);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Failed to load projects');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchProjects();
        }
    }, [isLoggedIn, currentPage, statusFilter, archivedFilter]);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (isLoggedIn) {
                setCurrentPage(1);
                fetchProjects();
            }
        }, 400);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    // Realtime: auto-refresh when project events occur
    useEffect(() => {
        const handleProjectUpdated = () => {
            fetchProjects();
        };
        socket.on('project_updated', handleProjectUpdated);
        return () => {
            socket.off('project_updated', handleProjectUpdated);
        };
    }, [isLoggedIn, currentPage, statusFilter, archivedFilter, searchTerm]);

    useEffect(() => {
        const loadMembers = async () => {
            if (isLoggedIn && isWorkspaceOwner) {
                try {
                    const list = await getWorkspaceMembers();
                    setWorkspaceMembersList(list);
                } catch (err) {
                    console.error('Failed to fetch workspace members:', err);
                }
            }
        };
        loadMembers();
    }, [isLoggedIn, isWorkspaceOwner]);

    const handleProjectCreated = () => {
        setIsCreateModalOpen(false);
        fetchProjects();
    };

    // Export Projects
    const handleExport = async () => {
        try {
            const blob = await exportProjects();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `projects_export_${Date.now()}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success('Projects exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export projects');
        }
    };

    // Import Projects
    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const array = Array.isArray(parsed) ? parsed : (parsed.projects || []);
                if (array.length === 0) {
                    toast.error('No projects found in the selected file');
                    return;
                }
                const toastId = toast.loading('Importing projects...');
                await importProjects(array);
                toast.success(`Successfully imported projects!`, { id: toastId });
                fetchProjects();
            } catch (err) {
                console.error(err);
                toast.error('Failed to parse file. Make sure it is valid JSON.');
            }
        };
        reader.readAsText(file);
    };

    // Archive Project
    const handleArchiveProject = async (id) => {
        try {
            await archiveProject(id);
            toast.success('Project archived successfully');
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to archive project');
        }
    };

    // Restore Project
    const handleRestoreProject = async (id) => {
        try {
            await restoreProject(id);
            toast.success('Project restored successfully');
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to restore project');
        }
    };

    // Clone / Duplicate Save
    const handleDuplicateSave = async () => {
        if (!activeProjectId) return;
        setDuplicating(true);
        try {
            await duplicateProject(activeProjectId, duplicateName);
            toast.success('Project cloned successfully');
            setIsDuplicateModalOpen(false);
            setDuplicateName('');
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to duplicate project');
        } finally {
            setDuplicating(false);
        }
    };

    // Transfer Save
    const handleTransferSave = async () => {
        if (!activeProjectId || !transferTargetUserId) return;
        setTransferring(true);
        try {
            await transferOwnership(activeProjectId, parseInt(transferTargetUserId, 10));
            toast.success('Project ownership transferred successfully');
            setIsTransferModalOpen(false);
            setTransferTargetUserId('');
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to transfer ownership');
        } finally {
            setTransferring(false);
        }
    };

    // Join Save
    const handleJoinSave = async (e) => {
        e.preventDefault();
        if (!joinForm.inviteCode) return;
        setJoining(true);
        try {
            await joinProject(joinForm);
            toast.success('Joined project successfully!');
            setIsJoinModalOpen(false);
            setJoinForm({ inviteCode: '', password: '' });
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to join project. Check credentials.');
        } finally {
            setJoining(false);
        }
    };

    const handleCopy = (text, type) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`);
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 pb-12">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                            <FolderKanban className="w-10 h-10 text-blue-600 animate-pulse" />
                            Project Hub
                        </h1>
                        <p className="text-gray-600 font-medium">Coordinate your team, milestones, credentials, and task deliverables.</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="px-5 py-3 border border-blue-200 bg-white hover:bg-blue-50/50 text-blue-700 font-bold rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            <LogIn className="w-5 h-5" />
                            Join Project
                        </button>
                        
                        {isWorkspaceOwner && (
                            <>
                                <button
                                    onClick={handleExport}
                                    className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    <Download className="w-5 h-5" />
                                    Export
                                </button>

                                <label className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer">
                                    <FolderInput className="w-5 h-5" />
                                    Import
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        onChange={handleImport} 
                                        className="hidden" 
                                    />
                                </label>
                            </>
                        )}

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/15 flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-5 h-5" />
                            New Project
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-5 shadow-xl shadow-blue-100/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-155 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-3 bg-gray-50 border border-gray-155 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-600 cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                        </select>

                        <button
                            onClick={() => {
                                setArchivedFilter(!archivedFilter);
                                setCurrentPage(1);
                            }}
                            className={`px-5 py-3 rounded-2xl font-bold border transition flex items-center gap-2 cursor-pointer ${
                                archivedFilter 
                                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner' 
                                : 'bg-gray-50 border-gray-155 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <Archive className="w-5 h-5" />
                            {archivedFilter ? 'Showing Archived' : 'Show Archived'}
                        </button>
                    </div>
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-xl border border-gray-100 max-w-xl mx-auto mt-8">
                        <FolderKanban className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No projects found</h3>
                        <p className="text-gray-500 mb-6 font-medium">Try refining your search queries or invite filters.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow cursor-pointer"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => {
                                const progress = project.progress !== undefined ? project.progress : 0;
                                const statusColors = {
                                    planning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                                    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                    completed: 'bg-blue-50 text-blue-800 border-blue-200',
                                    'on-hold': 'bg-gray-50 text-gray-800 border-gray-200',
                                };

                                const canManage = isWorkspaceOwner || project.userRole === 'owner' || project.userRole === 'manager';

                                return (
                                    <div
                                        key={project.id}
                                        className={`bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group ${
                                            project.isArchived ? 'opacity-80 border-dashed border-amber-200' : ''
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border uppercase ${statusColors[project.status] || statusColors.planning}`}>
                                                    {project.status} {project.isArchived ? '(Archived)' : ''}
                                                </span>

                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMenuOpenProjectId(menuOpenProjectId === project.id ? null : project.id);
                                                        }}
                                                        className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-gray-500 hover:text-gray-700"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {/* Project Actions Dropdown Menu */}
                                                    {menuOpenProjectId === project.id && (
                                                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl py-2 z-20 text-sm font-semibold text-gray-700 animate-scale-in">
                                                            <button
                                                                onClick={() => {
                                                                    setCredentialsProject(project);
                                                                    setIsCredentialsModalOpen(true);
                                                                    setMenuOpenProjectId(null);
                                                                }}
                                                                className="w-full px-4 py-2 hover:bg-blue-50 text-left flex items-center gap-2 cursor-pointer text-blue-700"
                                                            >
                                                                <Key className="w-4 h-4" />
                                                                Credentials
                                                            </button>

                                                            {canManage && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProjectId(project.id);
                                                                            setDuplicateName(`${project.name} (Copy)`);
                                                                            setIsDuplicateModalOpen(true);
                                                                            setMenuOpenProjectId(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 hover:bg-gray-50 text-left flex items-center gap-2 cursor-pointer"
                                                                    >
                                                                        <Copy className="w-4 h-4" />
                                                                        Clone / Duplicate
                                                                    </button>

                                                                    {project.isArchived ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleRestoreProject(project.id);
                                                                                setMenuOpenProjectId(null);
                                                                            }}
                                                                            className="w-full px-4 py-2 hover:bg-amber-50 text-left flex items-center gap-2 cursor-pointer text-amber-700"
                                                                        >
                                                                            <RefreshCw className="w-4 h-4" />
                                                                            Restore Project
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleArchiveProject(project.id);
                                                                                setMenuOpenProjectId(null);
                                                                            }}
                                                                            className="w-full px-4 py-2 hover:bg-amber-50 text-left flex items-center gap-2 cursor-pointer text-amber-600"
                                                                        >
                                                                            <Archive className="w-4 h-4" />
                                                                            Archive Project
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProjectId(project.id);
                                                                            setIsTransferModalOpen(true);
                                                                            setMenuOpenProjectId(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 hover:bg-rose-50 text-left flex items-center gap-2 cursor-pointer text-rose-600"
                                                                    >
                                                                        <Users className="w-4 h-4" />
                                                                        Transfer Ownership
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 
                                                onClick={() => navigate(`/projects/${project.id}`)}
                                                className="text-2xl font-extrabold text-gray-800 hover:text-blue-600 transition-colors mb-2 line-clamp-1 cursor-pointer flex items-center gap-1.5"
                                            >
                                                {project.name}
                                                {project.password && <Shield className="w-4 h-4 text-emerald-600 inline" title="Password protected" />}
                                            </h3>
                                            <p className="text-gray-500 text-sm font-semibold mb-6 line-clamp-2">
                                                {project.description || 'No description provided.'}
                                            </p>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            {/* Progress bar */}
                                            <div>
                                                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                                    <span>Task Completion</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Date range and details */}
                                            <div className="flex items-center justify-between text-gray-500 text-sm font-semibold pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span>
                                                        {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => navigate(`/projects/${project.id}`)}
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors group cursor-pointer"
                                                >
                                                    <span className="text-xs font-extrabold">Open Hub</span>
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination controls */}
                        {pagination.pages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-3 font-semibold text-gray-700">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border border-gray-200 bg-white rounded-xl disabled:opacity-50 hover:bg-gray-50 transition cursor-pointer"
                                >
                                    Previous
                                </button>
                                <span>Page {currentPage} of {pagination.pages}</span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                    disabled={currentPage === pagination.pages}
                                    className="px-4 py-2 border border-gray-200 bg-white rounded-xl disabled:opacity-50 hover:bg-gray-50 transition cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Create Project Modal */}
                <CreateProjectModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onProjectCreated={handleProjectCreated}
                />

                {/* JOIN PROJECT MODAL */}
                {isJoinModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <LogIn className="text-blue-600 w-6 h-6" />
                                    Join Protected Project
                                </h3>
                                <button 
                                    onClick={() => setIsJoinModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleJoinSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Invite Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. PROJ-XXXXXX"
                                        value={joinForm.inviteCode}
                                        onChange={(e) => setJoinForm({ ...joinForm, inviteCode: e.target.value.toUpperCase().trim() })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Password (Optional)</label>
                                    <input
                                        type="password"
                                        placeholder="Enter project password if required"
                                        value={joinForm.password}
                                        onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsJoinModalOpen(false)}
                                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={joining}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition shadow cursor-pointer flex items-center gap-2"
                                    >
                                        {joining ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Joining...
                                            </>
                                        ) : 'Join Project'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* DUPLICATE PROJECT MODAL */}
                {isDuplicateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Copy className="text-blue-600 w-6 h-6" />
                                    Clone Project
                                </h3>
                                <button 
                                    onClick={() => setIsDuplicateModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">New Project Name</label>
                                    <input
                                        type="text"
                                        value={duplicateName}
                                        onChange={(e) => setDuplicateName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setIsDuplicateModalOpen(false)}
                                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDuplicateSave}
                                        disabled={duplicating || !duplicateName}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition shadow cursor-pointer flex items-center gap-2"
                                    >
                                        {duplicating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Cloning...
                                            </>
                                        ) : 'Clone'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TRANSFER OWNERSHIP MODAL */}
                {isTransferModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <ShieldAlert className="text-rose-600 w-6 h-6" />
                                    Transfer Ownership
                                </h3>
                                <button 
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-gray-600">
                                    Transferring ownership will grant full administrator control of this project to the selected member.
                                </p>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Target Workspace Member</label>
                                    <select
                                        value={transferTargetUserId}
                                        onChange={(e) => setTransferTargetUserId(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700 cursor-pointer"
                                    >
                                        <option value="">-- Choose member --</option>
                                        {workspaceMembersList.map(member => (
                                            <option key={member.id} value={member.id}>{member.name} ({member.email})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setIsTransferModalOpen(false)}
                                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTransferSave}
                                        disabled={transferring || !transferTargetUserId}
                                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition shadow cursor-pointer flex items-center gap-2"
                                    >
                                        {transferring ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Transferring...
                                            </>
                                        ) : 'Transfer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROJECT CREDENTIALS VIEW MODAL */}
                {isCredentialsModalOpen && credentialsProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Shield className="text-emerald-600 w-6 h-6" />
                                    Project Credentials
                                </h3>
                                <button 
                                    onClick={() => {
                                        setIsCredentialsModalOpen(false);
                                        setCredentialsProject(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Invite Code</span>
                                        <button 
                                            onClick={() => handleCopy(credentialsProject.inviteCode, 'Code')}
                                            className="p-1 hover:bg-gray-200 rounded transition text-blue-600 cursor-pointer"
                                            title="Copy Code"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-lg font-extrabold text-gray-800">{credentialsProject.inviteCode}</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Invite Link</span>
                                        <button 
                                            onClick={() => handleCopy(credentialsProject.inviteLink, 'Link')}
                                            className="p-1 hover:bg-gray-200 rounded transition text-blue-600 cursor-pointer"
                                            title="Copy Link"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 break-all">{credentialsProject.inviteLink}</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Project Password</span>
                                    </div>
                                    <p className="text-base font-extrabold text-gray-800">
                                        {credentialsProject.password || <span className="text-gray-400 italic">No password set</span>}
                                    </p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => {
                                            setIsCredentialsModalOpen(false);
                                            setCredentialsProject(null);
                                        }}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition cursor-pointer"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ProjectsPage;
