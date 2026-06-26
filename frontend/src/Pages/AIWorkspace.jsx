import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getProjects,
    createProject,
    createTask as createProjectTask,
    getProjectDetails
} from '../Services/projectApi';
import { createSubtask } from '../Services/taskApi';
import {
    generateTasks,
    summarizeMeeting,
    askCopilot,
    planSprint,
    generateDocs,
    analyzeRisks,
    sendWeeklySummary,
    planSprintV2,
    getDailyStandup
} from '../Services/aiApi';
import {
    Loader,
    Wand2,
    FileText,
    CheckCircle,
    Calendar,
    AlertCircle,
    Plus,
    Settings,
    ArrowRight,
    CheckSquare,
    Play,
    Clock,
    MessageSquare,
    ShieldAlert,
    Sparkles,
    Send,
    Copy,
    Mail,
    AlertTriangle,
    Check,
    Flame
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AIWorkspace = () => {
    const { isLoggedIn, loading: authLoading, user: authUser } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('task-generator');
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // ==========================================
    // GLOBAL METADATA LOAD
    // ==========================================
    const fetchProjectsList = async () => {
        try {
            setProjectsLoading(true);
            const data = await getProjects();
            setProjects(data);
            if (data.length > 0) {
                setSelectedProjectId(data[0].id.toString());
                setConvertProjectId(data[0].id.toString());
                setSprintProjectId(data[0].id.toString());
                setRiskProjectId(data[0].id.toString());
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

    // ==========================================
    // AI TASK GENERATOR STATE
    // ==========================================
    const [projectDesc, setProjectDesc] = useState('');
    const [generatingTasks, setGeneratingTasks] = useState(false);
    const [loaderText, setLoaderText] = useState('Consulting AI Project Planner...');
    const [generatedRoadmap, setGeneratedRoadmap] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [importMode, setImportMode] = useState('existing');
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectStart, setNewProjectStart] = useState('');
    const [newProjectEnd, setNewProjectEnd] = useState('');
    const [importingTasks, setImportingTasks] = useState(false);

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

            const roadmapTasks = generatedRoadmap.tasks || [];
            let tasksCreatedCount = 0;
            let subtasksCreatedCount = 0;
            let baseDate = new Date();
            if (importMode === 'new' && newProjectStart) {
                baseDate = new Date(newProjectStart);
            }

            for (const item of roadmapTasks) {
                const due = new Date(baseDate);
                due.setDate(due.getDate() + (item.daysToComplete || 3));

                const taskRes = await createProjectTask(projectId, {
                    title: item.title,
                    description: item.description || '',
                    priority: item.priority || 'medium',
                    dueDate: due.toISOString().split('T')[0]
                });

                tasksCreatedCount++;

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
            setGeneratedRoadmap(null);
            setProjectDesc('');
            setNewProjectName('');
            setNewProjectDesc('');
            fetchProjectsList();
            navigate(`/projects/${projectId}`);
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Failed to import tasks fully.');
        } finally {
            setImportingTasks(false);
        }
    };

    // ==========================================
    // AI MEETING SUMMARIZER STATE
    // ==========================================
    const [meetingNotes, setMeetingNotes] = useState('');
    const [summarizing, setSummarizing] = useState(false);
    const [summaryResult, setSummaryResult] = useState(null);
    const [summarizerLoaderText, setSummarizerLoaderText] = useState('Analyzing notes...');
    const [convertingItemIdx, setConvertingItemIdx] = useState(null);
    const [convertProjectId, setConvertProjectId] = useState('');

    useEffect(() => {
        let interval;
        if (summarizing) {
            const texts = [
                'Analyzing meeting notes...',
                'Extracting action points...',
                'Mapping team responsibilities...',
                'Formatting final summary brief...'
            ];
            let idx = 0;
            interval = setInterval(() => {
                idx = (idx + 1) % texts.length;
                setSummarizerLoaderText(texts[idx]);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [summarizing]);

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

    const handleConvertToActionItem = async (actionText, index) => {
        if (!convertProjectId) {
            toast.error('Please select a project to import tasks to');
            return;
        }

        try {
            setConvertingItemIdx(index);
            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + 5);

            await createProjectTask(parseInt(convertProjectId, 10), {
                title: actionText,
                description: 'Extracted from AI Meeting Summary logs.',
                priority: 'medium',
                dueDate: defaultDueDate.toISOString().split('T')[0]
            });

            toast.success('Action item converted into a task! ✅');
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

    const [importingGeneratedTaskIdx, setImportingGeneratedTaskIdx] = useState(null);

    const handleImportGeneratedTask = async (taskTitle, taskDesc, taskPriority, index) => {
        if (!convertProjectId) {
            toast.error('Please select a project to import tasks to');
            return;
        }

        try {
            setImportingGeneratedTaskIdx(index);
            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + 5);

            await createProjectTask(parseInt(convertProjectId, 10), {
                title: taskTitle,
                description: taskDesc || 'Generated by AI Meeting Summarizer.',
                priority: taskPriority || 'medium',
                dueDate: defaultDueDate.toISOString().split('T')[0]
            });

            toast.success('Generated task imported to project! ✅');
            setSummaryResult(prev => ({
                ...prev,
                generatedTasks: prev.generatedTasks.filter((_, i) => i !== index)
            }));
        } catch (err) {
            console.error('Generated task import error:', err);
            toast.error('Failed to import task.');
        } finally {
            setImportingGeneratedTaskIdx(null);
        }
    };


    // ==========================================
    // AI SPRINT PLANNER STATE
    // ==========================================
    const [sprintProjectId, setSprintProjectId] = useState('');
    const [projectTasks, setProjectTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState({});
    const [sprintName, setSprintName] = useState('Sprint 1');
    const [sprintGoal, setSprintGoal] = useState('');
    const [planningSprint, setPlanningSprint] = useState(false);
    const [sprintPlanResult, setSprintPlanResult] = useState(null);

    // Fetch tasks when project selection changes for Sprint planning
    useEffect(() => {
        if (sprintProjectId) {
            const fetchTasks = async () => {
                try {
                    setTasksLoading(true);
                    const details = await getProjectDetails(parseInt(sprintProjectId, 10));
                    setProjectTasks(details.tasks || []);
                    // Auto select all tasks
                    const initialSelected = {};
                    (details.tasks || []).forEach(t => {
                        initialSelected[t.id] = true;
                    });
                    setSelectedTasks(initialSelected);
                } catch (error) {
                    console.error('Failed to load project details:', error);
                    toast.error('Could not fetch project tasks');
                } finally {
                    setTasksLoading(false);
                }
            };
            fetchTasks();
        }
    }, [sprintProjectId]);

    const handleToggleTaskSelection = (taskId) => {
        setSelectedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    const handlePlanSprint = async (e) => {
        e.preventDefault();
        const tasksToPlan = projectTasks.filter(t => selectedTasks[t.id]);
        if (tasksToPlan.length === 0) {
            toast.error('Please select at least one task to plan.');
            return;
        }

        try {
            setPlanningSprint(true);
            setSprintPlanResult(null);
            const data = await planSprint(sprintName, sprintGoal, tasksToPlan);
            setSprintPlanResult(data);
            toast.success('Sprint plan optimized by AI Agile Coach!');
        } catch (error) {
            console.error('Sprint planner error:', error);
            toast.error('Failed to generate sprint plan');
        } finally {
            setPlanningSprint(false);
        }
    };

    // ==========================================
    // DOCUMENT GENERATOR STATE
    // ==========================================
    const [docType, setDocType] = useState('Product Requirements Document (PRD)');
    const [topicDescription, setTopicDescription] = useState('');
    const [generatingDocsState, setGeneratingDocsState] = useState(false);
    const [docsResult, setDocsResult] = useState(null);
    const [copiedDoc, setCopiedDoc] = useState(false);

    const handleGenerateDocs = async (e) => {
        e.preventDefault();
        if (!topicDescription.trim()) return;

        try {
            setGeneratingDocsState(true);
            setDocsResult(null);
            const result = await generateDocs(docType, topicDescription.trim());
            setDocsResult(result);
            toast.success('Documentation generated successfully!');
        } catch (error) {
            console.error('Doc generator error:', error);
            toast.error('Failed to generate documentation');
        } finally {
            setGeneratingDocsState(false);
        }
    };

    const handleCopyDoc = () => {
        if (docsResult?.markdownContent) {
            navigator.clipboard.writeText(docsResult.markdownContent);
            setCopiedDoc(true);
            toast.success('Markdown copied to clipboard!');
            setTimeout(() => setCopiedDoc(false), 2000);
        }
    };

    // ==========================================
    // RISK ANALYZER STATE
    // ==========================================
    const [riskProjectId, setRiskProjectId] = useState('');
    const [analyzingRisksState, setAnalyzingRisksState] = useState(false);
    const [risksResult, setRisksResult] = useState(null);

    const handleAnalyzeRisks = async () => {
        if (!riskProjectId) return;

        try {
            setAnalyzingRisksState(true);
            setRisksResult(null);
            const result = await analyzeRisks(parseInt(riskProjectId, 10));
            setRisksResult(result);
            toast.success('Risk assessment completed!');
        } catch (error) {
            console.error('Risk analysis error:', error);
            toast.error('Failed to evaluate project risks');
        } finally {
            setAnalyzingRisksState(false);
        }
    };

    // ==========================================
    // COPILOT CHAT STATE
    // ==========================================
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: 'Hello! I am TaskForge Copilot. How can I assist you with your projects, sprints, or tasks today?' }
    ]);
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSendChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || sendingChat) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setSendingChat(true);

        try {
            const apiHistory = chatHistory.map(h => ({
                role: h.role,
                content: h.content
            }));
            const res = await askCopilot(userMessage, apiHistory);
            setChatHistory(prev => [...prev, { role: 'assistant', content: res.reply }]);
        } catch (error) {
            console.error('Copilot error:', error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error retrieving my response. Please try again.' }]);
        } finally {
            setSendingChat(false);
        }
    };

    // ==========================================
    // WEEKLY REPORT EMAIL TRIGGER
    // ==========================================
    const [sendingWeeklyEmail, setSendingWeeklyEmail] = useState(false);

    const handleSendWeeklyEmail = async () => {
        try {
            setSendingWeeklyEmail(true);
            await sendWeeklySummary();
            toast.success(`Productivity report dispatched to ${authUser?.email || 'your email'}! 📧`);
        } catch (error) {
            console.error('Failed to send weekly summary:', error);
            toast.error('Failed to email productivity report.');
        } finally {
            setSendingWeeklyEmail(false);
        }
    };

    // ==========================================
    // DAILY STANDUP GENERATOR
    // ==========================================
    const [dailyStandupData, setDailyStandupData] = useState(null);
    const [loadingStandup, setLoadingStandup] = useState(false);
    const [regeneratingStandup, setRegeneratingStandup] = useState(false);

    const handleFetchDailyStandup = async (isRegen = false) => {
        if (isRegen) setRegeneratingStandup(true);
        else setLoadingStandup(true);
        try {
            const data = await getDailyStandup(isRegen);
            setDailyStandupData(data);
            if (isRegen) toast.success('Daily Standup updated with latest activity!');
        } catch (err) {
            console.error('Failed to get standup:', err);
            toast.error('Failed to fetch daily standup.');
        } finally {
            setLoadingStandup(false);
            setRegeneratingStandup(false);
        }
    };

    // ==========================================
    // AI SPRINT PLANNER (BLUEPRINT GENERATOR)
    // ==========================================
    const [sprintPlannerMode, setSprintPlannerMode] = useState('blueprint'); // 'blueprint' | 'agile'
    const [projectDescBlueprint, setProjectDescBlueprint] = useState('');
    const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
    const [blueprintResult, setBlueprintResult] = useState(null);

    const handleGenerateSprintBlueprint = async (e) => {
        e.preventDefault();
        if (!projectDescBlueprint.trim()) return;

        setGeneratingBlueprint(true);
        try {
            const result = await planSprintV2(projectDescBlueprint);
            setBlueprintResult(result);
            toast.success('Sprint blueprint successfully drafted!');
        } catch (error) {
            console.error('Failed to generate blueprint:', error);
            toast.error('Sprint blueprint generation failed.');
        } finally {
            setGeneratingBlueprint(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'daily-standup') {
            handleFetchDailyStandup(false);
        }
    }, [activeTab]);


    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-semibold animate-pulse">Initializing Neural Workspace...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background ambient glowing circles */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="pb-6 border-b border-white/10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                            TaskForge Neural Center
                        </h1>
                        <p className="text-slate-400 mt-1 font-medium font-sans">Deploy advanced workspace intelligences to plan roadmap vectors, analyze delivery risks, and draft specs.</p>
                    </div>

                    <button
                        onClick={handleSendWeeklyEmail}
                        disabled={sendingWeeklyEmail}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-bold hover:bg-white/[0.08] active:bg-white/[0.12] transition shadow-lg text-indigo-300 disabled:opacity-50 cursor-pointer"
                    >
                        {sendingWeeklyEmail ? (
                            <Loader className="w-4 h-4 animate-spin text-indigo-400" />
                        ) : (
                            <Mail className="w-4 h-4 text-indigo-400" />
                        )}
                        Email Weekly Summary Report
                    </button>
                </div>

                {/* Tabs Grid Navigation */}
                <div className="flex flex-wrap gap-2 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl mb-8">
                    {[
                        { id: 'task-generator', name: 'Task Generator', icon: Settings },
                        { id: 'meeting-summarizer', name: 'Meeting Summarizer', icon: FileText },
                        { id: 'sprint-planner', name: 'Sprint Planner', icon: Calendar },
                        { id: 'risk-analyzer', name: 'Risk Analyzer', icon: ShieldAlert },
                        { id: 'doc-generator', name: 'Doc Generator', icon: FileText },
                        { id: 'daily-standup', name: 'Daily Standup', icon: Flame },
                        { id: 'copilot-chat', name: 'Copilot Chat', icon: MessageSquare }
                    ].map(t => {
                        const IconComponent = t.icon;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                                    activeTab === t.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10 border border-blue-500/30'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                }`}
                            >
                                <IconComponent className="w-4 h-4" />
                                {t.name}
                            </button>
                        );
                    })}
                </div>

                {/* Content Section */}
                <div className="min-h-[480px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* TAB 1: TASK GENERATOR */}
                            {activeTab === 'task-generator' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                        <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-blue-400" />
                                            Define Scope
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mb-6 font-sans">Explain the core objective, components, or feature requirements.</p>

                                        <form onSubmit={handleGenerateTasks} className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Scope Details</label>
                                                <textarea
                                                    value={projectDesc}
                                                    onChange={(e) => setProjectDesc(e.target.value)}
                                                    placeholder="Example: Set up a full verification email workflow. Generate tasks for creating tables, sending emails via Brevo, and UI token checking page."
                                                    rows={6}
                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-200 font-semibold text-sm placeholder-slate-500"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={generatingTasks || !projectDesc.trim()}
                                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                {generatingTasks ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin text-white" />
                                                        Consulting Advisor...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4 text-white" />
                                                        Generate Roadmap
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        {generatingTasks && (
                                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="relative mb-6">
                                                    <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <Wand2 className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-200">{loaderText}</h4>
                                                <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Neural components are mapping workflow structures and scheduling timeline blocks.</p>
                                            </div>
                                        )}

                                        {!generatingTasks && !generatedRoadmap && (
                                            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
                                                <Wand2 className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                                                <h4 className="text-slate-400 font-bold">Workspace Pending Objective Input</h4>
                                                <p className="text-xs text-slate-500 max-w-xs mt-1 font-sans">Provide project instructions on the left to structure tasks, priorities, and subtasks.</p>
                                            </div>
                                        )}

                                        {!generatingTasks && generatedRoadmap && (
                                            <div className="space-y-6">
                                                {/* Import Options Panel */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-5">
                                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                                        <h4 className="font-bold text-slate-100 flex items-center gap-2">
                                                            <Wand2 className="w-5 h-5 text-indigo-400" />
                                                            Roadmap Generated
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full uppercase">
                                                            {generatedRoadmap.tasks?.length || 0} Road Tasks
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-6">
                                                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-350">
                                                            <input
                                                                type="radio"
                                                                name="import-mode"
                                                                checked={importMode === 'existing'}
                                                                onChange={() => setImportMode('existing')}
                                                                className="w-4 h-4 text-blue-600 focus:ring-0"
                                                            />
                                                            Merge into Existing Project
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-350">
                                                            <input
                                                                type="radio"
                                                                name="import-mode"
                                                                checked={importMode === 'new'}
                                                                onChange={() => setImportMode('new')}
                                                                className="w-4 h-4 text-blue-600 focus:ring-0"
                                                            />
                                                            Initialize New Project Space
                                                        </label>
                                                    </div>

                                                    {importMode === 'existing' ? (
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Workspace Destination</label>
                                                            <select
                                                                value={selectedProjectId}
                                                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                                                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none"
                                                            >
                                                                {projects.map(p => (
                                                                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Project Space Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={newProjectName}
                                                                    onChange={(e) => setNewProjectName(e.target.value)}
                                                                    placeholder="e.g. Profile Upgrades Workspace"
                                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Project Space Description</label>
                                                                <input
                                                                    type="text"
                                                                    value={newProjectDesc}
                                                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                                                    placeholder="e.g. Building subtask checklists with ImageKit integrations"
                                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleImportRoadmap}
                                                        disabled={importingTasks}
                                                        className="w-full py-3 bg-white text-slate-950 rounded-2xl font-bold text-xs shadow-md hover:bg-slate-100 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {importingTasks ? (
                                                            <>
                                                                <Loader className="w-4 h-4 animate-spin text-slate-950" />
                                                                Syncing Tasks...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="w-4 h-4 text-slate-950" />
                                                                Commit Tasks to Project Workspace
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Tasks Preview List */}
                                                <div className="space-y-4">
                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Roadmap Preview Details</h5>
                                                    {(generatedRoadmap.tasks || []).map((t, idx) => (
                                                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h6 className="font-bold text-sm text-slate-200">{t.title}</h6>
                                                                    <p className="text-xs text-slate-400 mt-1 font-sans">{t.description}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                                                        t.priority === 'critical' || t.priority === 'high'
                                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                    }`}>
                                                                        {t.priority}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20 flex items-center gap-1">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        {t.daysToComplete} Days
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {t.subtasks && t.subtasks.length > 0 && (
                                                                <div className="pt-3 border-t border-white/5">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Checklist Items</span>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {t.subtasks.map((st, sIdx) => (
                                                                            <div key={sIdx} className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl text-xs text-slate-300">
                                                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                                                                {st}
                                                                            </div>
                                                                        ))}
                                                                    </div>
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

                            {/* TAB 2: MEETING SUMMARIZER */}
                            {activeTab === 'meeting-summarizer' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                        <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-indigo-400" />
                                            Meeting Notes
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mb-6 font-sans">Input transcript notes or raw outline summaries to isolate deliverable action items.</p>

                                        <form onSubmit={handleSummarizeMeeting} className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Meeting notes or transcripts</label>
                                                <textarea
                                                    value={meetingNotes}
                                                    onChange={(e) => setMeetingNotes(e.target.value)}
                                                    placeholder="Example: Imran suggested we should push the database schema changes first. Sarah Chen is going to design the super-admin console mockups by tomorrow, and Imran will implement the controller endpoints later this week."
                                                    rows={8}
                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-200 font-semibold text-sm placeholder-slate-500"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={summarizing || !meetingNotes.trim()}
                                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                {summarizing ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin text-white" />
                                                        Analyzing Brief...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4 text-white" />
                                                        Extract Deliverables
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        {summarizing && (
                                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="relative mb-6">
                                                    <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <FileText className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-200">{summarizerLoaderText}</h4>
                                                <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Neural pipeline is parsing text patterns to isolate discussion contexts and action deliverables.</p>
                                            </div>
                                        )}

                                        {!summarizing && !summaryResult && (
                                            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
                                                <FileText className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                                                <h4 className="text-slate-400 font-bold">Pending Meeting Brief Details</h4>
                                                <p className="text-xs text-slate-500 max-w-xs mt-1 font-sans">Input discussion summaries on the left to extract structured paragraphs and task action tables.</p>
                                            </div>
                                        )}

                                        {!summarizing && summaryResult && (
                                            <div className="space-y-6 animate-in fade-in">
                                                {/* Summary Result Box */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                                    <h4 className="font-bold text-slate-100 mb-3 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                                        Executive Brief Summary
                                                    </h4>
                                                    <p className="text-sm leading-relaxed text-slate-300 font-sans">{summaryResult.summary}</p>
                                                </div>

                                                {/* Action Items List */}
                                                <div className="space-y-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Extracted Action Deliverables</h5>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">Target Project:</span>
                                                            <select
                                                                value={convertProjectId}
                                                                onChange={(e) => setConvertProjectId(e.target.value)}
                                                                className="px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-xl text-xxs font-bold text-slate-355 focus:outline-none"
                                                            >
                                                                {projects.map(p => (
                                                                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {summaryResult.actionItems?.length === 0 ? (
                                                        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl text-center text-xs text-slate-500 font-sans">
                                                            All action items have been processed!
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {summaryResult.actionItems?.map((item, idx) => (
                                                                <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-200">{item.task}</p>
                                                                        <p className="text-xxs text-indigo-400 mt-1 font-bold">Suggested: {item.assigneeHint || 'Unassigned'}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleConvertToActionItem(item.task, idx)}
                                                                        disabled={convertingItemIdx === idx}
                                                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold transition flex-shrink-0 cursor-pointer disabled:opacity-50"
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

                                                {/* Risks Identified */}
                                                <div className="space-y-4 pt-4 border-t border-white/5">
                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Risks & Bottlenecks Identified</h5>
                                                    {!summaryResult.risks || summaryResult.risks.length === 0 ? (
                                                        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl text-center text-xs text-slate-500 font-sans">
                                                            No clear risks or bottlenecks identified from discussion notes.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {summaryResult.risks.map((r, idx) => (
                                                                <div key={idx} className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl flex justify-between items-center gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <AlertTriangle className={`w-4 h-4 ${
                                                                            r.severity === 'high' ? 'text-red-400 animate-pulse' : 'text-yellow-400'
                                                                        }`} />
                                                                        <span className="text-xs font-semibold text-slate-200">{r.risk}</span>
                                                                    </div>
                                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                                                        r.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                                                    }`}>
                                                                        {r.severity}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* AI Generated Tasks */}
                                                <div className="space-y-4 pt-4 border-t border-white/5">
                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Recommended Concrete Tasks</h5>
                                                    {!summaryResult.generatedTasks || summaryResult.generatedTasks.length === 0 ? (
                                                        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl text-center text-xs text-slate-500 font-sans">
                                                            All generated tasks have been imported!
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {summaryResult.generatedTasks.map((t, idx) => (
                                                                <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-200">{t.title}</p>
                                                                        <p className="text-xs text-slate-450 mt-1 font-sans">{t.description}</p>
                                                                        <span className={`inline-block text-[9px] font-bold uppercase mt-2 px-2 py-0.5 rounded ${
                                                                            t.priority === 'critical' || t.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'
                                                                        }`}>
                                                                            Priority: {t.priority}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleImportGeneratedTask(t.title, t.description, t.priority, idx)}
                                                                        disabled={importingGeneratedTaskIdx === idx}
                                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-[10px] font-bold transition flex-shrink-0 cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        {importingGeneratedTaskIdx === idx ? (
                                                                            <Loader className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        )}
                                                                        Import Task
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

                            {/* TAB 3: SPRINT PLANNER */}
                            {activeTab === 'sprint-planner' && (
                                <div className="space-y-6">
                                    {/* Toggle sub-mode selector */}
                                    <div className="flex gap-4 border-b border-white/5 pb-4">
                                        <button
                                            onClick={() => setSprintPlannerMode('blueprint')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                                sprintPlannerMode === 'blueprint'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                            }`}
                                        >
                                            AI Project Blueprint Generator
                                        </button>
                                        <button
                                            onClick={() => setSprintPlannerMode('agile')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                                sprintPlannerMode === 'agile'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                            }`}
                                        >
                                            Agile Coach Sprint Planner
                                        </button>
                                    </div>

                                    {sprintPlannerMode === 'blueprint' ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            {/* Blueprint Form */}
                                            <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                                <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                                    Sprint Blueprint
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium mb-6 font-sans">Input your high-level project description to let AI auto-plan all Sprints, team allocations, timelines, and risks.</p>

                                                <form onSubmit={handleGenerateSprintBlueprint} className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Project Description</label>
                                                        <textarea
                                                            value={projectDescBlueprint}
                                                            onChange={(e) => setProjectDescBlueprint(e.target.value)}
                                                            placeholder="Example: Build a SaaS platform with internal chat using Socket.IO, PostgreSQL database schema with Drizzle, user 2FA, and a wiki/SOP knowledge base."
                                                            rows={8}
                                                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-200 font-semibold text-sm placeholder-slate-500 bg-slate-950/20"
                                                            required
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={generatingBlueprint || !projectDescBlueprint.trim()}
                                                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {generatingBlueprint ? (
                                                            <>
                                                                <Loader className="w-4 h-4 animate-spin text-white" />
                                                                Generating Blueprint...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Wand2 className="w-4 h-4 text-white" />
                                                                Generate Sprint Blueprint
                                                            </>
                                                        )}
                                                    </button>
                                                </form>
                                            </div>

                                            {/* Blueprint Result Panel */}
                                            <div className="lg:col-span-2 space-y-6">
                                                {generatingBlueprint && (
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                                        <div className="relative mb-6">
                                                            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                            <Sparkles className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                        </div>
                                                        <h4 className="text-base font-bold text-slate-200 font-sans">Drafting Sprints & Team Distributions...</h4>
                                                        <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Generating timeline schedules, assessing project risks, and allocating engineers.</p>
                                                    </div>
                                                )}

                                                {!generatingBlueprint && !blueprintResult && (
                                                    <div className="bg-[#0b0f19]/30 border border-white/5 border-dashed rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[300px]">
                                                        <Calendar className="w-8 h-8 text-slate-600 mb-3" />
                                                        <p className="text-xs font-bold font-sans">Input a project description and click Generate to see the blueprint details.</p>
                                                    </div>
                                                )}

                                                {!generatingBlueprint && blueprintResult && (
                                                    <div className="space-y-6">
                                                        {/* Timeline info */}
                                                        <div className="bg-gradient-to-br from-indigo-950/30 to-blue-950/30 border border-[#2e375e] p-6 rounded-3xl flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-wider block">PROJECTED TIMELINE</span>
                                                                <p className="text-sm font-black text-white mt-1">
                                                                    {blueprintResult.timeline?.startDate} — {blueprintResult.timeline?.endDate}
                                                                </p>
                                                            </div>
                                                            <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                                                                <span className="text-lg font-black text-indigo-300">{blueprintResult.timeline?.totalDurationDays}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase">Days</span>
                                                            </div>
                                                        </div>

                                                        {/* Sprint Breakdown */}
                                                        <div className="space-y-4">
                                                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Sprint Breakdown</h4>
                                                            {blueprintResult.sprintBreakdown?.map((sprint, sprintIdx) => (
                                                                <div key={sprintIdx} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <h5 className="font-black text-slate-200 text-sm">{sprint.sprintName}</h5>
                                                                            <p className="text-xxs text-indigo-300 font-bold mt-0.5">Goal: {sprint.goal}</p>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{sprint.durationDays} Days</span>
                                                                    </div>
                                                                    <div className="space-y-2 border-t border-white/5 pt-4">
                                                                        {sprint.tasks?.map((task, taskIdx) => (
                                                                            <div key={taskIdx} className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-200">{task.title}</p>
                                                                                    <p className="text-[10px] text-slate-500 mt-0.5">{task.description}</p>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25">{task.role}</span>
                                                                                    <span className="text-[9px] font-black text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{task.points} SP</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Team Allocation */}
                                                        <div className="space-y-4">
                                                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Team Allocation</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                {blueprintResult.teamAllocation?.map((alloc, aIdx) => (
                                                                    <div key={aIdx} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-2">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-xs font-black text-slate-200">{alloc.role}</span>
                                                                            <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded-full">{alloc.count} Alloc</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-400 leading-normal font-sans">{alloc.allocation}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Risks & Mitigation */}
                                                        <div className="space-y-4">
                                                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Risks & Mitigation</h4>
                                                            <div className="space-y-2.5">
                                                                {blueprintResult.risks?.map((risk, rIdx) => (
                                                                    <div key={rIdx} className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex justify-between items-start gap-4">
                                                                        <div>
                                                                            <span className="text-[10px] font-black text-rose-450 uppercase block">Risk: {risk.risk}</span>
                                                                            <p className="text-[10px] text-slate-400 mt-1 font-sans">Mitigation: {risk.mitigation}</p>
                                                                        </div>
                                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                                            risk.severity === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                                                                        }`}>
                                                                            {risk.severity} Severity
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                                <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                                    Configure Sprint
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium mb-6 font-sans">Select a project scope and assign task weight criteria to optimize details.</p>

                                                <form onSubmit={handlePlanSprint} className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Select Project</label>
                                                        <select
                                                            value={sprintProjectId}
                                                            onChange={(e) => setSprintProjectId(e.target.value)}
                                                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none"
                                                        >
                                                            {projects.map(p => (
                                                                <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Sprint Name</label>
                                                        <input
                                                            type="text"
                                                            value={sprintName}
                                                            onChange={(e) => setSprintName(e.target.value)}
                                                            placeholder="e.g. Sprint 1 - Core Auth"
                                                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none bg-slate-900"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Sprint Goal (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={sprintGoal}
                                                            onChange={(e) => setSprintGoal(e.target.value)}
                                                            placeholder="e.g. Finalize token validation pipelines"
                                                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none bg-slate-900"
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={planningSprint || projectTasks.length === 0}
                                                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {planningSprint ? (
                                                            <>
                                                                <Loader className="w-4 h-4 animate-spin text-white" />
                                                                Optimizing Sprint...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4 text-white" />
                                                                Generate Sprint Plan
                                                            </>
                                                        )}
                                                    </button>
                                                </form>
                                            </div>

                                            <div className="lg:col-span-2 space-y-6">
                                                {planningSprint && (
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                                        <div className="relative mb-6">
                                                            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                            <Calendar className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                        </div>
                                                        <h4 className="text-base font-bold text-slate-200">Consulting AI Agile Advisor...</h4>
                                                        <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Calculating velocity patterns and distributing task weights across sprint limits.</p>
                                                    </div>
                                                )}

                                                {!planningSprint && !sprintPlanResult && (
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                                        <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
                                                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                                                            Select Tasks to Plan ({projectTasks.length} available)
                                                        </h4>

                                                        {tasksLoading ? (
                                                            <div className="py-12 flex justify-center">
                                                                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                                                            </div>
                                                        ) : projectTasks.length === 0 ? (
                                                            <p className="text-xs text-slate-500 py-6 text-center font-sans">No tasks available in this project. Create some first!</p>
                                                        ) : (
                                                            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                                                {projectTasks.map(t => (
                                                                    <label key={t.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl cursor-pointer transition">
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!!selectedTasks[t.id]}
                                                                                onChange={() => handleToggleTaskSelection(t.id)}
                                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-0"
                                                                            />
                                                                            <div>
                                                                                <span className="text-xs font-semibold text-slate-200">{t.title}</span>
                                                                                <span className="block text-[10px] text-slate-455 mt-0.5 font-sans">{t.priority} priority</span>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-xxs font-bold text-slate-400 uppercase bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{t.status}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {!planningSprint && sprintPlanResult && (
                                                    <div className="space-y-6">
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
                                                            <div>
                                                                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1">Coaches Recommendation</span>
                                                                <h4 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
                                                                    <Sparkles className="w-5 h-5 text-yellow-400" />
                                                                    Sprint Target: {sprintPlanResult.goalRecommendation}
                                                                </h4>
                                                            </div>
                                                            <p className="text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4 font-sans">{sprintPlanResult.sprintSummary}</p>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Allocated Story Point Vectors</h5>
                                                            {sprintPlanResult.pointsAllocation?.map((item, idx) => (
                                                                <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-200">{item.taskTitle}</p>
                                                                        <p className="text-xxs text-slate-450 mt-1 font-sans">{item.reason}</p>
                                                                    </div>
                                                                    <div className="flex flex-col items-center justify-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex-shrink-0">
                                                                        <span className="text-lg font-extrabold text-indigo-300">{item.recommendedPoints}</span>
                                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Points</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: RISK ANALYZER */}
                            {activeTab === 'risk-analyzer' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                        <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                                            <ShieldAlert className="w-5 h-5 text-indigo-400" />
                                            Analyze Risks
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mb-6 font-sans">Select a project space and run AI risk models to discover blockers and timeline issues.</p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Project space</label>
                                                <select
                                                    value={riskProjectId}
                                                    onChange={(e) => setRiskProjectId(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none"
                                                >
                                                    {projects.map(p => (
                                                        <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                onClick={handleAnalyzeRisks}
                                                disabled={analyzingRisksState || !riskProjectId}
                                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {analyzingRisksState ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin text-white" />
                                                        Evaluating Vectors...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4 text-white" />
                                                        Evaluate Health & Bottlenecks
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        {analyzingRisksState && (
                                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="relative mb-6">
                                                    <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <ShieldAlert className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-200">Scanning Project Roadmap...</h4>
                                                <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Comparing current progress vectors against target schedule milestones.</p>
                                            </div>
                                        )}

                                        {!analyzingRisksState && !risksResult && (
                                            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
                                                <ShieldAlert className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                                                <h4 className="text-slate-400 font-bold">Risk Assessment Pending</h4>
                                                <p className="text-xs text-slate-500 max-w-xs mt-1 font-sans">Select a workspace on the left and trigger scanning algorithms to compute health scores.</p>
                                            </div>
                                        )}

                                        {!analyzingRisksState && risksResult && (
                                            <div className="space-y-6 animate-in fade-in">
                                                {/* Health Score Summary */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center gap-6">
                                                    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                                                            <circle cx="48" cy="48" r="40" stroke={risksResult.healthScore >= 75 ? "#10b981" : risksResult.healthScore >= 45 ? "#f59e0b" : "#ef4444"} strokeWidth="6" fill="transparent"
                                                                strokeDasharray={251.2}
                                                                strokeDashoffset={251.2 - (251.2 * risksResult.healthScore) / 100}
                                                            />
                                                        </svg>
                                                        <span className="absolute text-xl font-extrabold text-white">{risksResult.healthScore}%</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-100 text-lg">Workspace Velocity Health Score</h4>
                                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                                                            This score represents task progression efficiency. {risksResult.healthScore >= 75 ? 'The project is tracking stably with low risk of delay.' : risksResult.healthScore >= 45 ? 'Minor bottleneck dependencies detected. Review tasks below.' : 'High threat profile. Urgent task updates recommended.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Bottlenecks Lists */}
                                                <div className="space-y-3">
                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Active Vulnerability Detections</h5>
                                                    {risksResult.risksDetected?.length === 0 ? (
                                                        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl text-center text-xs text-slate-400 font-sans">
                                                            No timeline bottlenecks or delay risks detected! Excellent roadmap management.
                                                        </div>
                                                    ) : (
                                                        risksResult.risksDetected?.map((item, idx) => (
                                                            <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-start gap-3">
                                                                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                                                    item.severity === 'critical' || item.severity === 'high' ? 'text-red-400 animate-pulse' : 'text-yellow-400'
                                                                }`} />
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-sm font-bold text-slate-200">{item.taskTitle}</span>
                                                                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                                                            item.severity === 'critical' || item.severity === 'high'
                                                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                                        }`}>
                                                                            {item.severity}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-indigo-300 mt-1 font-semibold font-sans">{item.riskType}</p>
                                                                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">{item.description}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Recommendations */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                                        Strategic Delivery Adjustments
                                                    </h5>
                                                    <ul className="space-y-3">
                                                        {risksResult.recommendations?.map((rec, idx) => (
                                                            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                                                                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 5: DOCUMENT GENERATOR */}
                            {activeTab === 'doc-generator' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                        <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-indigo-400" />
                                            Design Spec
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mb-6 font-sans">Input topic parameters and type criteria to generate technical specs or summaries.</p>

                                        <form onSubmit={handleGenerateDocs} className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Document Type</label>
                                                <select
                                                    value={docType}
                                                    onChange={(e) => setDocType(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none"
                                                >
                                                    {[
                                                        'Product Requirements Document (PRD)',
                                                        'API Specification Document',
                                                        'Employee Onboarding Playbook',
                                                        'Agile Sprint Retro Review',
                                                        'Business Requirements Document (BRD)',
                                                        'Software Requirements Specification (SRS)',
                                                        'Project Proposal',
                                                        'Weekly Performance Report',
                                                        'Release Notes'
                                                    ].map(t => (
                                                        <option key={t} value={t} className="bg-slate-900">{t}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Topic Description</label>
                                                <textarea
                                                    value={topicDescription}
                                                    onChange={(e) => setTopicDescription(e.target.value)}
                                                    placeholder="Example: Document a dual-tab registration workflow with workspace creation and join requests code verification checks."
                                                    rows={6}
                                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-200 font-semibold text-sm placeholder-slate-500"
                                                    required
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={generatingDocsState || !topicDescription.trim()}
                                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                {generatingDocsState ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin text-white" />
                                                        Writing Specs...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 text-white" />
                                                        Generate Specification Document
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        {generatingDocsState && (
                                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="relative mb-6">
                                                    <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <FileText className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-200">Generating Markdown Spec...</h4>
                                                <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Generating clean code blocks, headers, tables, and procedural structures.</p>
                                            </div>
                                        )}

                                        {!generatingDocsState && !docsResult && (
                                            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
                                                <FileText className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                                                <h4 className="text-slate-400 font-bold">Documentation Board Empty</h4>
                                                <p className="text-xs text-slate-500 max-w-xs mt-1 font-sans">Isolate your technical scope guidelines on the left to compile standard specs.</p>
                                            </div>
                                        )}

                                        {!generatingDocsState && docsResult && (
                                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4 animate-in fade-in">
                                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                                    <h4 className="font-bold text-slate-100">{docsResult.title}</h4>
                                                    <button
                                                        onClick={handleCopyDoc}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xxs font-bold text-slate-300 transition cursor-pointer"
                                                    >
                                                        {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                        {copiedDoc ? 'Copied' : 'Copy MD'}
                                                    </button>
                                                </div>
                                                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-black/25 p-4 rounded-xl border border-white/5 max-h-[360px] overflow-y-auto">
                                                    {docsResult.markdownContent}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 6: DAILY STANDUP */}
                            {activeTab === 'daily-standup' && (
                                <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                                <Flame className="w-5 h-5 text-indigo-400" />
                                                Daily Scrum Standup Report
                                            </h3>
                                            <p className="text-xs text-slate-400 font-medium font-sans mt-1">Generated automatically from yesterday's activity and today's task schedules.</p>
                                        </div>
                                        <button
                                            onClick={() => handleFetchDailyStandup(true)}
                                            disabled={loadingStandup || regeneratingStandup}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold hover:bg-white/[0.08] active:bg-white/[0.12] transition shadow-lg text-indigo-300 disabled:opacity-50 cursor-pointer"
                                        >
                                            {regeneratingStandup ? (
                                                <Loader className="w-4 h-4 animate-spin text-indigo-400" />
                                            ) : (
                                                <Flame className="w-4 h-4 text-indigo-400" />
                                            )}
                                            {regeneratingStandup ? 'Updating...' : 'Regenerate Standup'}
                                        </button>
                                    </div>

                                    {loadingStandup ? (
                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[300px]">
                                            <Loader className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                            <p className="text-xs text-slate-400 font-medium">Assembling daily updates and standup bullet points...</p>
                                        </div>
                                    ) : !dailyStandupData ? (
                                        <div className="bg-[#0b0f19]/30 border border-white/5 border-dashed rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[300px]">
                                            <Flame className="w-8 h-8 text-slate-600 mb-3 animate-pulse" />
                                            <p className="text-xs font-bold font-sans">No standup report generated yet. Click Regenerate Standup to trigger.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Yesterday achievements */}
                                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-3">
                                                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Yesterday</h4>
                                                </div>
                                                <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-wrap">{dailyStandupData.yesterday}</p>
                                            </div>

                                            {/* Today planned */}
                                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-3">
                                                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                    <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Today</h4>
                                                </div>
                                                <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-wrap">{dailyStandupData.today}</p>
                                            </div>

                                            {/* Blockers */}
                                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-3">
                                                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                    <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Blockers</h4>
                                                </div>
                                                <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed font-sans ${
                                                    dailyStandupData.blockers?.toLowerCase() !== 'none' ? 'bg-rose-500/5 border border-rose-500/10 text-rose-350' : 'text-slate-400'
                                                }`}>
                                                    {dailyStandupData.blockers}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 7: COPILOT CHAT */}
                            {activeTab === 'copilot-chat' && (
                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl shadow-xl backdrop-blur-md max-w-4xl mx-auto flex flex-col h-[520px] overflow-hidden animate-in fade-in">
                                    <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center">
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-200">Neural Copilot Assistant</h4>
                                                <p className="text-[10px] text-slate-450 mt-0.5 font-sans">Context aware: Analyzing active project vectors & deliverables</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                        {chatHistory.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-sans ${
                                                    msg.role === 'user'
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white/[0.04] border border-white/5 text-slate-200 rounded-tl-none'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {sendingChat && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/[0.04] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <form onSubmit={handleSendChat} className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Ask Copilot: 'What tasks are currently overdue?' or 'Draft an onboarding description...'"
                                            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs font-semibold text-slate-200 placeholder-slate-500"
                                            disabled={sendingChat}
                                        />
                                        <button
                                            type="submit"
                                            disabled={sendingChat || !chatInput.trim()}
                                            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 flex-shrink-0 flex items-center justify-center"
                                        >
                                            <Send className="w-4 h-4 text-white" />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AIWorkspace;
