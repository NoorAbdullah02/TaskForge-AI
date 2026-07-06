import { useState } from 'react';
import { 
    X, FolderPlus, Loader, Calendar, AlignLeft, Sparkles, 
    CheckSquare, HelpCircle, Megaphone, UserPlus, FileImage, 
    ArrowRight, ArrowLeft, Square, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createProject } from '../Services/projectApi';

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedTypes, setSelectedTypes] = useState(['task', 'asset']);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const WORK_TYPES = [
        { 
            id: 'task', 
            label: 'Task', 
            description: 'A small piece of work.', 
            icon: CheckSquare, 
            color: 'text-blue-600', 
            iconBg: 'bg-blue-50 border-blue-100',
            activeBorder: 'border-blue-500 bg-blue-50/10'
        },
        { 
            id: 'request', 
            label: 'Request', 
            description: 'An ask for assistance.', 
            icon: HelpCircle, 
            color: 'text-emerald-600', 
            iconBg: 'bg-emerald-50 border-emerald-100',
            activeBorder: 'border-blue-500 bg-blue-50/10'
        },
        { 
            id: 'campaign', 
            label: 'Campaign', 
            description: 'A marketing strategy with a defined goal.', 
            icon: Megaphone, 
            color: 'text-purple-600', 
            iconBg: 'bg-purple-50 border-purple-100',
            activeBorder: 'border-blue-500 bg-blue-50/10'
        },
        { 
            id: 'candidate', 
            label: 'Candidate', 
            description: 'A person in consideration for a role.', 
            icon: UserPlus, 
            color: 'text-amber-600', 
            iconBg: 'bg-amber-50 border-amber-100',
            activeBorder: 'border-blue-500 bg-blue-50/10'
        },
        { 
            id: 'asset', 
            label: 'Asset', 
            description: 'A file, image, or video.', 
            icon: FileImage, 
            color: 'text-indigo-600', 
            iconBg: 'bg-indigo-50 border-indigo-100',
            activeBorder: 'border-blue-500 bg-blue-50/10'
        }
    ];

    const toggleWorkType = (id) => {
        if (selectedTypes.includes(id)) {
            if (selectedTypes.length > 1) {
                setSelectedTypes(selectedTypes.filter(t => t !== id));
            } else {
                toast.error('At least one work type must be selected');
            }
        } else {
            setSelectedTypes([...selectedTypes, id]);
        }
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Project name is required');
            return;
        }
        setStep(2);
    };

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
                workTypes: selectedTypes.join(',')
            });
            toast.success(data.message || 'Project created successfully! 🚀');
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setSelectedTypes(['task', 'asset']);
            setStep(1);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white/95 rounded-[32px] shadow-2xl p-6 md:p-8 max-w-xl w-full border border-gray-150 relative overflow-hidden backdrop-blur-lg transition-all duration-300">
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-36 h-36 bg-blue-400/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-36 h-36 bg-purple-400/10 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>

                <div className="flex justify-between items-center mb-5 relative z-10">
                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <FolderPlus className="w-7 h-7 text-blue-600" />
                        {step === 1 ? 'New Project Details' : 'Configure Work Types'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {step === 1 ? (
                    /* Step 1: Basic Information */
                    <form onSubmit={handleNext} className="space-y-4 relative z-10">
                        {/* Project Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project Name</label>
                            <div className="relative">
                                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter project name"
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-800 font-bold text-sm bg-white"
                                    required
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                            <div className="relative">
                                <AlignLeft className="absolute left-4 top-4 text-purple-500 w-5 h-5" />
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this project about?"
                                    rows={3}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-800 font-semibold text-sm bg-white"
                                ></textarea>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-800 font-bold text-xs bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 w-5 h-5" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-855 font-bold text-xs bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition font-bold text-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-95 transition font-extrabold text-sm shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                Next Step
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Step 2: Work Types Selector */
                    <div className="space-y-5 relative z-10 animate-fade-in">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800">What types of work do you need?</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">These form the building blocks of your project.</p>
                        </div>

                        {/* List of custom work type cards */}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {WORK_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = selectedTypes.includes(type.id);

                                return (
                                    <div
                                        key={type.id}
                                        onClick={() => toggleWorkType(type.id)}
                                        className={`flex items-center justify-between p-3.5 border-2 rounded-2xl transition-all duration-200 cursor-pointer hover:shadow-sm ${
                                            isSelected 
                                                ? 'border-blue-500 bg-blue-50/15 shadow-sm shadow-blue-500/5' 
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icon with colored bg */}
                                            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${type.iconBg}`}>
                                                <Icon className={`w-5 h-5 ${type.color}`} />
                                            </div>
                                            
                                            {/* Title & Description */}
                                            <div>
                                                <p className="text-sm font-extrabold text-slate-800">{type.label}</p>
                                                <p className="text-xxs text-slate-500 font-medium">{type.description}</p>
                                            </div>
                                        </div>

                                        {/* Checkbox representation */}
                                        <div className="flex items-center pr-1">
                                            {isSelected ? (
                                                <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center border border-blue-600 transition-all">
                                                    <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-md border-2 border-gray-300 bg-white transition-all"></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xxs text-slate-400 font-bold text-center">Don't worry, you can change these later.</p>

                        {/* Submit Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition font-bold text-sm cursor-pointer flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || selectedTypes.length === 0}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-95 transition font-extrabold text-sm shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create Project
                                        <Sparkles className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateProjectModal;
