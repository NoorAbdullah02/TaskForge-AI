import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects } from '../Services/projectApi';
import CreateProjectModal from '../Components/CreateProjectModal';
import { FolderKanban, Plus, Calendar, Users, BarChart3, Loader, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectsPage = () => {
    const { isLoggedIn, loading: authLoading } = useAuth();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    // Redirect to login if unauthorized
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const data = await getProjects();
            // Calculate mock details or fetch real task statistics to get progress
            setProjects(data);
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
    }, [isLoggedIn]);

    const handleProjectCreated = (newProject) => {
        // reload list
        fetchProjects();
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                            <FolderKanban className="w-10 h-10 text-blue-600" />
                            Project Hub
                        </h1>
                        <p className="text-gray-600 font-medium">Coordinate your team, milestones, and task deliverables.</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Project
                    </button>
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-gray-100 max-w-xl mx-auto mt-12">
                        <FolderKanban className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No projects found</h3>
                        <p className="text-gray-500 mb-6 font-medium">Get started by creating your first collaborative workspace.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => {
                            // Check if progress is defined, otherwise default to a mock or fetched value
                            const progress = project.progress !== undefined ? project.progress : 0;
                            const statusColors = {
                                planning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                active: 'bg-green-100 text-green-800 border-green-200',
                                completed: 'bg-blue-100 text-blue-800 border-blue-200',
                                'on-hold': 'bg-gray-100 text-gray-800 border-gray-200',
                            };

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border uppercase ${statusColors[project.status] || statusColors.planning}`}>
                                                {project.status}
                                            </span>
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                                                {project.userRole || 'Member'}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl font-extrabold text-gray-850 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">
                                            {project.name}
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

                                            <div className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                                                <span className="text-xs font-extrabold">Open Workspace</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create Project Modal */}
                <CreateProjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onProjectCreated={handleProjectCreated}
                />
            </div>
        </div>
    );
};

export default ProjectsPage;
