import React, { useState, useEffect } from 'react';
import { 
    Clock, Calendar, ChevronRight, Activity, ArrowRight, Loader2, 
    BarChart, LayoutGrid, AlertCircle, Sparkles, Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { getProjects } from '../Services/projectApi';
import { getEpics } from '../Services/agileApi';
import { getTasks } from '../Services/taskApi';

export default function GanttChartPage() {
    const { user: _user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [epics, setEpics] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Gantt Settings
    const [, setTimeScale] = useState('days'); // days, weeks

    const loadProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
            if (data.length > 0) {
                setSelectedProjectId(data[0].id.toString());
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            toast.error('Failed to load projects');
            setLoading(false);
        }
    };

    const loadGanttData = async () => {
        if (!selectedProjectId) return;
        setLoading(true);
        try {
            const epicsData = await getEpics(parseInt(selectedProjectId, 10));
            setEpics(epicsData);

            const tasksData = await getTasks(parseInt(selectedProjectId, 10));
            setTasks(tasksData);
        } catch (error) {
            console.error('Failed to load Gantt details:', error);
            toast.error('Failed to load Gantt timeline data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        loadGanttData();
    }, [selectedProjectId]);

    // Timeline Date Generation (default to current month)
    const getTimelineDays = () => {
        const days = [];
        const start = new Date();
        start.setDate(start.getDate() - 5); // Start 5 days ago for perspective
        
        for (let i = 0; i < 30; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            days.push(current);
        }
        return days;
    };

    const timelineDays = getTimelineDays();
    const timelineStart = timelineDays[0];
    const timelineEnd = timelineDays[timelineDays.length - 1];

    // Helper to calculate position percentage
    const getPositionPercentage = (startDate, endDate) => {
        const start = new Date(startDate || new Date());
        const end = new Date(endDate || new Date());

        const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
        
        // Clamp start date
        let startDiff = start.getTime() - timelineStart.getTime();
        if (startDiff < 0) startDiff = 0;
        
        // Clamp end date
        let endDiff = end.getTime() - timelineStart.getTime();
        if (endDiff > totalDuration) endDiff = totalDuration;
        if (endDiff < startDiff) endDiff = startDiff + (24 * 60 * 60 * 1000); // minimum 1 day width

        const left = (startDiff / totalDuration) * 100;
        const width = ((endDiff - startDiff) / totalDuration) * 100;

        return { left: Math.max(0, Math.min(100, left)), width: Math.max(2, Math.min(100 - left, width)) };
    };

    if (projects.length === 0 && !loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white rounded-3xl border border-blue-100 shadow-xl p-8 max-w-md text-center">
                    <Activity className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold text-gray-800">No active projects</h3>
                    <p className="text-gray-400 text-xs mt-2">Create a project first to configure the Gantt timeline dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200/60 mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
                            Gantt Chart Project Timelines
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Track project timelines, epic milestones, task schedules, and dependencies in real-time.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Project:</span>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="px-4 py-2 bg-white border border-blue-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white border border-blue-100/60 rounded-3xl shadow-xl shadow-blue-100/10 overflow-hidden">
                        
                        {/* Gantt Wrapper with Scroll */}
                        <div className="overflow-x-auto min-h-[60vh]">
                            <div className="min-w-[1000px] divide-y divide-gray-100">
                                
                                {/* 1. Timeline Header (Months and Days) */}
                                <div className="flex bg-gray-50/50">
                                    <div className="w-[300px] p-4 flex-shrink-0 font-bold text-xs text-gray-400 uppercase tracking-wider border-r border-gray-100">
                                        Tasks & Epics Hierarchy
                                    </div>
                                    <div className="flex-1 flex relative">
                                        {timelineDays.map((day, idx) => {
                                            const isToday = day.toDateString() === new Date().toDateString();
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`flex-1 text-center py-3 border-r border-gray-150/40 text-[10px] font-bold ${
                                                        isToday ? 'bg-blue-100/50 text-blue-700' : 'text-gray-500'
                                                    }`}
                                                >
                                                    <span className="block uppercase text-[8px] font-extrabold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                    <span className="text-xs">{day.getDate()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. Epics and Tasks Rows */}
                                <div className="divide-y divide-gray-100/80 bg-white">
                                    
                                    {/* EPICS */}
                                    {epics.map(epic => {
                                        const { left, width } = getPositionPercentage(epic.startDate, epic.endDate);
                                        return (
                                            <div key={`epic-${epic.id}`} className="flex items-center hover:bg-slate-50/30 transition-colors group">
                                                {/* Left descriptor */}
                                                <div className="w-[300px] p-4 flex-shrink-0 border-r border-gray-100 flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded bg-indigo-500 flex-shrink-0"></span>
                                                    <div>
                                                        <span className="font-extrabold text-sm text-gray-800 block truncate max-w-[240px]">{epic.name}</span>
                                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Epic</span>
                                                    </div>
                                                </div>

                                                {/* Gantt Bar */}
                                                <div className="flex-1 p-4 relative h-16">
                                                    {/* Grid lines inside row */}
                                                    <div className="absolute inset-0 flex">
                                                        {timelineDays.map((_, i) => (
                                                            <div key={i} className="flex-1 border-r border-gray-100/30 h-full"></div>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Horizontal Bar */}
                                                    <div 
                                                        style={{ left: `${left}%`, width: `${width}%` }}
                                                        className="absolute top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-xl shadow-md flex items-center justify-between overflow-hidden whitespace-nowrap min-w-[30px]"
                                                    >
                                                        <span className="truncate pr-1">{epic.name}</span>
                                                        <span className="font-mono text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">{epic.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* TASKS (direct project tasks or without epic groupings) */}
                                    {tasks.map(task => {
                                        // Assume start date is created_at and end date is due_date
                                        const { left, width } = getPositionPercentage(task.createdAt, task.dueDate);
                                        return (
                                            <div key={`task-${task.id}`} className="flex items-center hover:bg-slate-50/30 transition-colors group">
                                                {/* Left descriptor */}
                                                <div className="w-[300px] p-4 flex-shrink-0 border-r border-gray-100 flex items-center gap-4">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-1"></span>
                                                    <div>
                                                        <span className="font-bold text-xs text-gray-700 block truncate max-w-[220px]">{task.title}</span>
                                                        <span className="text-[9px] font-bold text-gray-400">Task</span>
                                                    </div>
                                                </div>

                                                {/* Gantt Bar */}
                                                <div className="flex-1 p-4 relative h-16">
                                                    {/* Grid lines inside row */}
                                                    <div className="absolute inset-0 flex">
                                                        {timelineDays.map((_, i) => (
                                                            <div key={i} className="flex-1 border-r border-gray-100/30 h-full"></div>
                                                        ))}
                                                    </div>

                                                    {/* Horizontal Bar */}
                                                    <div 
                                                        style={{ left: `${left}%`, width: `${width}%` }}
                                                        className="absolute top-1/2 -translate-y-1/2 bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold py-1.5 px-3 rounded-xl shadow-sm flex items-center justify-between overflow-hidden whitespace-nowrap min-w-[30px]"
                                                    >
                                                        <span className="truncate pr-1">{task.title}</span>
                                                        <span className="font-mono text-[9px] bg-blue-200/50 px-1 py-0.5 rounded uppercase">{task.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {epics.length === 0 && tasks.length === 0 && (
                                        <div className="text-center py-20 bg-slate-50/30">
                                            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                            <p className="text-gray-500 font-semibold text-sm">No items scheduled for this project</p>
                                            <p className="text-gray-400 text-xs">Plan epics and add task due dates to populate the Gantt schedule.</p>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                        {/* Timeline Footer Legend */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500 font-medium">
                            <span className="font-bold text-gray-700">Timeline Legend:</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-blue-600 rounded"></span>
                                Epics Schedule
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></span>
                                Tasks Timeline
                            </span>
                            <span className="ml-auto text-[10px] text-gray-400">Showing standard 30-day planning view centered on today.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
