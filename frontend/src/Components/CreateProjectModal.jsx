import { useState } from 'react';
import { X, FolderPlus, Loader, Calendar, AlignLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createProject } from '../Services/projectApi';

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Project name is required');
            return;
        }

        try {
            setIsLoading(true);
            const data = await createProject({
                name: name.trim(),
                description: description.trim() || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            toast.success(data.message || 'Project created successfully! 🚀');
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            onProjectCreated(data.project);
            onClose();
        } catch (error) {
            console.error('Create project error:', error);
            const msg = error?.response?.data?.message || 'Failed to create project. Please try again.';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white/95 rounded-3xl shadow-2xl p-6 md:p-8 max-w-lg w-full border border-gray-100 relative overflow-hidden backdrop-blur-md">
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -ml-16 -mt-16"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl -mr-16 -mb-16"></div>

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <FolderPlus className="w-8 h-8 text-blue-600 animate-pulse" />
                        Create Project
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Project Name</label>
                        <div className="relative">
                            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter project name"
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all text-gray-800 font-semibold"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Description</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 text-purple-500 w-5 h-5" />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this project about?"
                                rows={3}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all text-gray-800 font-semibold"
                            ></textarea>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all text-gray-800 font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all text-gray-800 font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
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
                            disabled={isLoading || !name.trim()}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition font-bold text-base shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectModal;
