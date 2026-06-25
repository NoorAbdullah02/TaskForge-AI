import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getProjects,
    createProject,
    createTask as createProjectTask
} from '../Services/projectApi';
import { createSubtask } from '../Services/taskApi';
import { generateTasks, summarizeMeeting } from '../Services/aiApi';
import {
    Loader,
    Wand2,
    FileText,
    CheckCircle,
    Calendar,
    AlertCircle,
    Plus,
    Briefcase,
    Settings,
    ArrowRight,
    Trophy,
    CheckSquare,
    Play,
    UserCheck,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const AIWorkspace = () => {
    const { isLoggedIn, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('task-generator');
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // ==========================================
    // AI TASK GENERATOR STATE
    // ==========================================
    const [projectDesc, setProjectDesc] = useState('');
    const [generatingTasks, setGeneratingTasks] = useState(false);
    const [loaderText, setLoaderText] = useState('Consulting AI Project Planner...');
    const [generatedRoadmap, setGeneratedRoadmap] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [importMode, setImportMode] = useState('existing'); // 'existing' or 'new'
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectStart, setNewProjectStart] = useState('');
    const [newProjectEnd, setNewProjectEnd] = useState('');
    const [importingTasks, setImportingTasks] = useState(false);

    // ==========================================
    // AI MEETING SUMMARIZER STATE
    // ==========================================
    const [meetingNotes, setMeetingNotes] = useState('');
    const [summarizing, setSummarizing] = useState(false);
    const [summaryResult, setSummaryResult] = useState(null);
    const [summarizerLoaderText, setSummarizerLoaderText] = useState('Analyzing meeting transcripts...');
    
    // Quick task conversion states for action items
    const [convertingItemIdx, setConvertingItemIdx] = useState(null);
    const [convertProjectId, setConvertProjectId] = useState('');

    // Redirect if unauthorized
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    // Fetch projects for importing tasks
    const fetchProjectsList = async () => {
        try {
            setProjectsLoading(true);
            const data = await getProjects();
            setProjects(data);
            if (data.length > 0) {
                setSelectedProjectId(data[0].id.toString());
                setConvertProjectId(data[0].id.toString());
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            toast.error('Failed to load project lists');
        } finally {
            setProjectsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchProjectsList();
        }
    }, [isLoggedIn]);

    // Loader text rotator for AI Task Generator
    useEffect(() => {
        let interval;
        if (generatingTasks) {
            const texts = [
                'Consulting AI Project Planner...',
                'Deconstructing project scope...',
                'Synthesizing milestones...',
                'Generating task checklists...',
                'Finalizing project timeline details...'
            ];
            let idx = 0;
            interval = setInterval(() => {
                idx = (idx + 1) % texts.length;
                setLoaderText(texts[idx]);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [generatingTasks]);

    // Loader text rotator for AI Meeting Summarizer
    useEffect(() => {
        let interval;
        if (summarizing) {
            const texts = [
                'Analyzing meeting transcripts...',
                'Extracting key discussion points...',
                'Identifying actionable checklist items...',
                'Formulating team responsibilities...',
                'Formatting final brief summary...'
            ];
            let idx = 0;
            interval = setInterval(() => {
                idx = (idx + 1) % texts.length;
                setSummarizerLoaderText(texts[idx]);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [summarizing]);

    // Handle task generation request
    const handleGenerateTasks = async (e) => {
        e.preventDefault();
        if (!projectDesc.trim()) return;

        try {
            setGeneratingTasks(true);
            setGeneratedRoadmap(null);
            const result = await generateTasks(projectDesc.trim());
            setGeneratedRoadmap(result);
            toast.success('AI project roadmap generated!');
        } catch (err) {
            console.error('Error generating tasks:', err);
            toast.error(err?.response?.data?.message || 'Failed to generate tasks');
        } finally {
            setGeneratingTasks(false);
        }
    };

    // Handle importing generated tasks into DB
    const handleImportRoadmap = async () => {
        if (importMode === 'existing' && !selectedProjectId) {
            toast.error('Please select an existing project');
            return;
        }

        if (importMode === 'new' && !newProjectName.trim()) {
            toast.error('Project Name is required');
            return;
        }

        try {
            setImportingTasks(true);
            let projectId = parseInt(selectedProjectId, 10);

            // Create new project if in 'new' mode
            if (importMode === 'new') {
                const newProj = await createProject({
                    name: newProjectName.trim(),
                    description: newProjectDesc.trim() || undefined,
                    startDate: newProjectStart || undefined,
                    endDate: newProjectEnd || undefined
                });
                projectId = newProj.id;
                toast.success(`Project "${newProj.name}" created!`);
            }

            // Loop and insert tasks & subtasks
            const roadmapTasks = generatedRoadmap.tasks || [];
            let tasksCreatedCount = 0;
            let subtasksCreatedCount = 0;

            // Simple date calculation baseline
            let baseDate = new Date();
            if (importMode === 'new' && newProjectStart) {
                baseDate = new Date(newProjectStart);
            }

            for (const item of roadmapTasks) {
                // Calculate task due date
                const due = new Date(baseDate);
                due.setDate(due.getDate() + (item.daysToComplete || 3));

                const taskRes = await createProjectTask(projectId, {
                    title: item.title,
                    description: item.description || '',
                    priority: item.priority || 'medium',
                    dueDate: due.toISOString().split('T')[0]
                });

                tasksCreatedCount++;

                // Create subtasks
                if (item.subtasks && item.subtasks.length > 0) {
                    for (const subTitle of item.subtasks) {
                        const targetTaskId = taskRes?.task?.id || taskRes?.id;
                        if (targetTaskId) {
                            await createSubtask(targetTaskId, subTitle);
                            subtasksCreatedCount++;
                        }
                    }
                }
            }

            toast.success(`Successfully imported ${tasksCreatedCount} tasks and ${subtasksCreatedCount} subtasks! 🎉`);
            
            // Clean up States
            setGeneratedRoadmap(null);
            setProjectDesc('');
            setNewProjectName('');
            setNewProjectDesc('');
            setNewProjectStart('');
            setNewProjectEnd('');
            fetchProjectsList(); // Refresh projects list
            
            // Redirect to project workspace
            navigate(`/projects/${projectId}`);
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Failed to import tasks fully. Please check database logs.');
        } finally {
            setImportingTasks(false);
        }
    };

    // Handle meeting notes summary request
    const handleSummarizeMeeting = async (e) => {
        e.preventDefault();
        if (!meetingNotes.trim()) return;

        try {
            setSummarizing(true);
            setSummaryResult(null);
            const result = await summarizeMeeting(meetingNotes.trim());
            setSummaryResult(result);
            toast.success('Meeting summary ready!');
        } catch (err) {
            console.error('Summarize error:', err);
            toast.error(err?.response?.data?.message || 'Failed to summarize notes');
        } finally {
            setSummarizing(false);
        }
    };

    // Convert individual action item to task
    const handleConvertToActionItem = async (actionText, index) => {
        if (!convertProjectId) {
            toast.error('Please select a project to import tasks to');
            return;
        }

        try {
            setConvertingItemIdx(index);
            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + 5); // Default 5 days out

            await createProjectTask(parseInt(convertProjectId, 10), {
                title: actionText,
                description: 'Extracted from AI Meeting Summary logs.',
                priority: 'medium',
                dueDate: defaultDueDate.toISOString().split('T')[0]
            });

            toast.success('Action item successfully converted into a workspace task! ✅');
            
            // Remove converted item from UI list
            setSummaryResult(prev => ({
                ...prev,
                actionItems: prev.actionItems.filter((_, i) => i !== index)
            }));
        } catch (err) {
            console.error('Action conversion error:', err);
            toast.error('Failed to convert action item to task.');
        } finally {
            setConvertingItemIdx(null);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 flex items-center justify-center">
                <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                            <Wand2 className="w-10 h-10 text-blue-600 animate-pulse" />
                            AI Workspace
                        </h1>
                        <p className="text-gray-600 font-medium mt-1">Supercharge your project productivity with advanced Gemini intelligence.</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-white/80 p-1.5 rounded-2xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => setActiveTab('task-generator')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition ${
                                activeTab === 'task-generator'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100/50'
                            }`}
                        >
                            <Settings className="w-4 h-4" />
                            AI Task Generator
                        </button>
                        <button
                            onClick={() => setActiveTab('meeting-summarizer')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition ${
                                activeTab === 'meeting-summarizer'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100/50'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            Meeting Summarizer
                        </button>
                    </div>
                </div>

                {/* ==========================================
                    TAB 1: AI TASK GENERATOR
                    ========================================== */}
                {activeTab === 'task-generator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Input Form */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    Define Project
                                </h3>
                                <p className="text-xs text-gray-500 font-semibold mb-6">Describe the objectives, scopes, tech, or components of your roadmap.</p>

                                <form onSubmit={handleGenerateTasks} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Project Scope / Instructions</label>
                                        <textarea
                                            value={projectDesc}
                                            onChange={(e) => setProjectDesc(e.target.value)}
                                            placeholder="Example: We need to build a new profile settings page that allows users to upload avatars via ImageKit, change passwords, and verify email. We will need backend controllers and router config..."
                                            rows={6}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-gray-750 text-sm"
                                            required
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={generatingTasks || !projectDesc.trim()}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {generatingTasks ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5" />
                                                Generate Project Roadmap
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right: Results / Import Block */}
                        <div className="lg:col-span-2 space-y-6">
                            {generatingTasks && (
                                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-blue-200 shadow flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <Wand2 className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 animate-pulse">{loaderText}</h4>
                                    <p className="text-xs text-gray-400 mt-1 max-w-sm">Gemini AI is parsing details, creating structured subtasks, and calculating optimal completion intervals.</p>
                                </div>
                            )}

                            {!generatingTasks && !generatedRoadmap && (
                                <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow min-h-[300px] flex flex-col items-center justify-center">
                                    <Wand2 className="w-12 h-12 text-gray-300 mb-3" />
                                    <h4 className="text-gray-400 font-bold">No roadmap generated yet</h4>
                                    <p className="text-xs text-gray-400 max-w-sm mt-1">Fill out the prompt scope details on the left and trigger the AI scheduler to preview deliverables.</p>
                                </div>
                            )}

                            {!generatingTasks && generatedRoadmap && (
                                <div className="space-y-6 animate-in fade-in">
                                    {/* Import Settings Panel */}
                                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-150 space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                            <h4 className="font-extrabold text-gray-800 text-lg">🚀 Import AI Roadmap</h4>
                                            <span className="text-xxs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase">
                                                {generatedRoadmap.tasks?.length || 0} Tasks Generated
                                            </span>
                                        </div>

                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                                                <input
                                                    type="radio"
                                                    name="import-mode"
                                                    checked={importMode === 'existing'}
                                                    onChange={() => setImportMode('existing')}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                Import to Existing Project
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                                                <input
                                                    type="radio"
                                                    name="import-mode"
                                                    checked={importMode === 'new'}
                                                    onChange={() => setImportMode('new')}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                Create New Project
                                            </label>
                                        </div>

                                        {importMode === 'existing' ? (
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Select Workspace Project</label>
                                                    <select
                                                        value={selectedProjectId}
                                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                                        className="w-full px-3 py-2.5 border-2 border-gray-250 rounded-xl text-sm font-bold text-gray-700 bg-white"
                                                    >
                                                        {projects.length === 0 ? (
                                                            <option value="">No projects available</option>
                                                        ) : (
                                                            projects.map((p) => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 bg-gray-55 p-4 rounded-2xl border border-gray-200">
                                                <h5 className="font-extrabold text-gray-700 text-xs uppercase mb-1">New Project Parameters</h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xxs font-bold text-gray-650 uppercase mb-1.5">Project Name</label>
                                                        <input
                                                            type="text"
                                                            value={newProjectName}
                                                            onChange={(e) => setNewProjectName(e.target.value)}
                                                            placeholder="Project name..."
                                                            className="w-full px-3 py-2 border-2 border-gray-250 rounded-xl text-xs font-bold text-gray-750"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xxs font-bold text-gray-650 uppercase mb-1.5">Short Summary</label>
                                                        <input
                                                            type="text"
                                                            value={newProjectDesc}
                                                            onChange={(e) => setNewProjectDesc(e.target.value)}
                                                            placeholder="Description..."
                                                            className="w-full px-3 py-2 border-2 border-gray-250 rounded-xl text-xs font-bold text-gray-750"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xxs font-bold text-gray-650 uppercase mb-1.5">Start Date</label>
                                                        <input
                                                            type="date"
                                                            value={newProjectStart}
                                                            onChange={(e) => setNewProjectStart(e.target.value)}
                                                            className="w-full px-3 py-2 border-2 border-gray-250 rounded-xl text-xs font-bold text-gray-750"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xxs font-bold text-gray-650 uppercase mb-1.5">End Target</label>
                                                        <input
                                                            type="date"
                                                            value={newProjectEnd}
                                                            onChange={(e) => setNewProjectEnd(e.target.value)}
                                                            className="w-full px-3 py-2 border-2 border-gray-250 rounded-xl text-xs font-bold text-gray-750"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleImportRoadmap}
                                            disabled={importingTasks}
                                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm shadow hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {importingTasks ? (
                                                <>
                                                    <Loader className="w-5 h-5 animate-spin" />
                                                    Importing Tasks to Workspace...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-5 h-5" />
                                                    Confirm Import Tasks
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Task Preview Cards */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide px-2">Generated Task List Preview</h4>
                                        {generatedRoadmap.tasks?.map((task, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-150 hover:shadow transition-all relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl -mr-8 -mt-8"></div>
                                                
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                    <h5 className="font-extrabold text-gray-800 text-base">{task.title}</h5>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xxs font-extrabold uppercase ${
                                                            task.priority === 'high' || task.priority === 'critical'
                                                                ? 'bg-red-50 text-red-700 border border-red-100'
                                                                : task.priority === 'medium'
                                                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {task.priority || 'medium'}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-xxs text-gray-400 font-bold bg-gray-50 border px-2 py-0.5 rounded">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {task.daysToComplete || 3} days
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-500 font-medium mb-4 leading-relaxed">{task.description}</p>

                                                {task.subtasks && task.subtasks.length > 0 && (
                                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/50 space-y-2">
                                                        <h6 className="text-xxs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                                            <CheckSquare className="w-4 h-4 text-blue-500" />
                                                            Subtasks Checklist
                                                        </h6>
                                                        <ul className="space-y-1.5">
                                                            {task.subtasks.map((sub, sidx) => (
                                                                <li key={sidx} className="text-xs text-gray-600 font-semibold flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-gray-450 rounded-full shrink-0"></div>
                                                                    {sub}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==========================================
                    TAB 2: AI MEETING SUMMARIZER
                    ========================================== */}
                {activeTab === 'meeting-summarizer' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Notes Input */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Meeting Notes
                                </h3>
                                <p className="text-xs text-gray-500 font-semibold mb-6">Paste raw meeting logs, summaries, or discussions below.</p>

                                <form onSubmit={handleSummarizeMeeting} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Transcripts / Notes</label>
                                        <textarea
                                            value={meetingNotes}
                                            onChange={(e) => setMeetingNotes(e.target.value)}
                                            placeholder="Example: Sarah: We need to push the client registration page by Tuesday. Alex, can you integrate the Brevo mail service for verification? Alex: Yes, I can do that on Monday. Emma: I will write the validation tests. Also, we must ask the designer about the color contrasts for inputs..."
                                            rows={8}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-gray-750 text-sm"
                                            required
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={summarizing || !meetingNotes.trim()}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {summarizing ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Analyzing Notes...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-5 h-5" />
                                                Summarize Meeting
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right: Results & Conversion Area */}
                        <div className="lg:col-span-2 space-y-6">
                            {summarizing && (
                                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-blue-200 shadow flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <FileText className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 animate-pulse">{summarizerLoaderText}</h4>
                                    <p className="text-xs text-gray-400 mt-1 max-w-sm">Gemini AI is parsing the conversation transcript, writing key updates, and mapping task actions to team players.</p>
                                </div>
                            )}

                            {!summarizing && !summaryResult && (
                                <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow min-h-[300px] flex flex-col items-center justify-center">
                                    <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                    <h4 className="text-gray-400 font-bold">No summary ready yet</h4>
                                    <p className="text-xs text-gray-400 max-w-sm mt-1">Paste meeting transcripts in the input on the left and trigger the AI agent to summarize outputs.</p>
                                </div>
                            )}

                            {!summarizing && summaryResult && (
                                <div className="space-y-6 animate-in fade-in">
                                    {/* Meeting Summary Card */}
                                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-4">
                                        <h4 className="font-extrabold text-gray-850 text-lg flex items-center gap-2 border-b border-gray-100 pb-3">
                                            <FileText className="w-5.5 h-5.5 text-blue-600" />
                                            Brief Summary
                                        </h4>
                                        <p className="text-sm text-gray-650 font-medium leading-relaxed whitespace-pre-wrap">{summaryResult.summary}</p>
                                    </div>

                                    {/* Action Items List */}
                                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                                            <div>
                                                <h4 className="font-extrabold text-gray-850 text-lg flex items-center gap-2">
                                                    <CheckSquare className="w-5.5 h-5.5 text-green-550" />
                                                    Action Items
                                                </h4>
                                                <p className="text-xxs text-gray-500 font-semibold mt-0.5">Directly convert extracted action items into workspace tasks.</p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xxs text-gray-400 font-bold uppercase shrink-0">Target Project:</span>
                                                <select
                                                    value={convertProjectId}
                                                    onChange={(e) => setConvertProjectId(e.target.value)}
                                                    className="px-2 py-1.5 border-2 border-gray-250 rounded-xl text-xxs font-bold text-gray-700 bg-white"
                                                >
                                                    {projects.length === 0 ? (
                                                        <option value="">No projects available</option>
                                                    ) : (
                                                        projects.map((p) => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {summaryResult.actionItems?.length === 0 ? (
                                            <p className="text-center text-gray-400 text-xs font-semibold py-4">All action items converted or cleared! 🎉</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {summaryResult.actionItems?.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-blue-200 transition-all">
                                                        <div className="flex items-start gap-3 overflow-hidden">
                                                            <div className="w-5 h-5 rounded-full border border-gray-400 shrink-0 mt-0.5 flex items-center justify-center text-xxs text-gray-400 font-bold">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-750">{item.task}</p>
                                                                <p className="text-xxs font-semibold text-gray-450 mt-1 flex items-center gap-1">
                                                                    <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                                                    Implied assignee: <span className="text-indigo-600 font-extrabold uppercase">{item.assigneeHint || 'Unassigned'}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => handleConvertToActionItem(item.task, idx)}
                                                            disabled={convertingItemIdx === idx || !convertProjectId}
                                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow transition shrink-0 self-end sm:self-auto disabled:opacity-50"
                                                        >
                                                            {convertingItemIdx === idx ? (
                                                                <Loader className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Plus className="w-3.5 h-3.5" />
                                                            )}
                                                            Convert to Task
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIWorkspace;
