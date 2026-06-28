import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEvents, scheduleMeeting } from '../Services/calendarApi';
import { Calendar as CalendarIcon, Video, Plus, ChevronLeft, ChevronRight, Loader2, Link as LinkIcon, User, Tag, CheckSquare, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const WorkspaceCalendar = () => {
    const { user } = useAuth();
    
    // Calendar Navigation States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Meeting Scheduler Modal
    const [showModal, setShowModal] = useState(false);
    const [meetTitle, setMeetTitle] = useState('');
    const [meetDesc, setMeetDesc] = useState('');
    const [meetStart, setMeetStart] = useState('');
    const [meetEnd, setMeetEnd] = useState('');
    const [meetLink, setMeetLink] = useState('');

    // Selected Day Focus Panel
    const [selectedDateObj, setSelectedDateObj] = useState(new Date());
    const [selectedDayEvents, setSelectedDayEvents] = useState([]);
    const [selectedDateStr, setSelectedDateStr] = useState('');

    const loadEvents = async (focusedDate = selectedDateObj) => {
        try {
            setLoading(true);
            const list = await getEvents();
            setEvents(list || []);
            
            const dateToFocus = focusedDate || new Date();
            const dayEvents = (list || []).filter(e => {
                const evDate = new Date(e.start);
                return evDate.getFullYear() === dateToFocus.getFullYear() &&
                       evDate.getMonth() === dateToFocus.getMonth() &&
                       evDate.getDate() === dateToFocus.getDate();
            });
            setSelectedDayEvents(dayEvents);
        } catch (error) {
            console.error('Failed to load calendar events:', error);
            toast.error('Could not load workspace calendar events.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const today = new Date();
        setSelectedDateObj(today);
        setSelectedDateStr(today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        loadEvents(today);
    }, [user?.activeWorkspaceId]);

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // First day of month
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Previous month total days to fill starting spaces
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Next month starting days to fill ending spaces
    const totalCells = 42; // 6 rows * 7 columns

    const cells = [];
    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        cells.push({
            day: prevMonthTotalDays - i,
            isCurrentMonth: false,
            date: new Date(year, month - 1, prevMonthTotalDays - i)
        });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
        cells.push({
            day: i,
            isCurrentMonth: true,
            date: new Date(year, month, i)
        });
    }
    // Next month padding
    let nextIndex = 1;
    while (cells.length < totalCells) {
        cells.push({
            day: nextIndex,
            isCurrentMonth: false,
            date: new Date(year, month + 1, nextIndex)
        });
        nextIndex++;
    }

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const getEventsForDate = (date) => {
        return events.filter(e => {
            const evDate = new Date(e.start);
            return evDate.getFullYear() === date.getFullYear() &&
                   evDate.getMonth() === date.getMonth() &&
                   evDate.getDate() === date.getDate();
        });
    };

    const handleDayClick = (cell) => {
        setSelectedDateObj(cell.date);
        const dayEvents = getEventsForDate(cell.date);
        setSelectedDayEvents(dayEvents);
        setSelectedDateStr(cell.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };

    const handleScheduleMeeting = async (e) => {
        e.preventDefault();
        if (!meetTitle || !meetStart || !meetEnd) {
            toast.error('Please input a title, start time, and end time');
            return;
        }

        const start = new Date(meetStart);
        const end = new Date(meetEnd);
        if (start > end) {
            toast.error('Start time cannot be after end time');
            return;
        }

        try {
            setSubmitting(true);
            await scheduleMeeting({
                title: meetTitle.trim(),
                description: meetDesc.trim(),
                startTime: meetStart,
                endTime: meetEnd,
                meetingLink: meetLink.trim()
            });
            toast.success('Meeting scheduled successfully! 🎙️');
            setShowModal(false);
            setMeetTitle('');
            setMeetDesc('');
            setMeetStart('');
            setMeetEnd('');
            setMeetLink('');
            loadEvents();
        } catch (error) {
            console.error('Failed to schedule meeting:', error);
            toast.error('Scheduling failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Color mapper
    const getColorClass = (color) => {
        switch (color) {
            case 'blue': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5';
            case 'red': return 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm shadow-red-500/5';
            case 'yellow': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5';
            case 'green': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5';
            default: return 'bg-slate-500/10 text-ink border border-slate-500/20';
        }
    };

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-line mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                            <CalendarIcon className="w-8 h-8 text-purple-400" />
                            Aggregated Workspace Calendar
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">
                            Synced display of team meetings, task deadlines, leaves, and user attendance status.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer border border-purple-500/20"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        Schedule Meeting
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                    {/* Left Panel: Month Grid */}
                    <div className="lg:col-span-8 bg-surface-2 border border-line rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col">
                        
                        {/* Month Header Controller */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                {monthNames[month]} {year}
                            </h2>

                            <div className="flex gap-2 bg-surface-3/50 p-1.5 rounded-2xl border border-line">
                                <button
                                    onClick={prevMonth}
                                    className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-1 border border-line hover:border-line-active text-ink hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-1 border border-line hover:border-line-active text-ink hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Board */}
                        <div className="grid grid-cols-7 gap-2 flex-1 min-h-[450px]">
                            {/* Days of week */}
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                <div key={d} className="text-center text-[10px] font-black text-ink-soft uppercase tracking-wider py-2">
                                    {d}
                                </div>
                            ))}

                            {/* Cells */}
                            {loading ? (
                                <div className="col-span-7 flex flex-col items-center justify-center py-20 text-ink-soft">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                                    <span className="text-xs">Recompiling calendar index...</span>
                                </div>
                            ) : (
                                cells.map((cell, idx) => {
                                    const dayEvents = getEventsForDate(cell.date);
                                    const isSelected = selectedDateObj &&
                                        cell.date.getFullYear() === selectedDateObj.getFullYear() &&
                                        cell.date.getMonth() === selectedDateObj.getMonth() &&
                                        cell.date.getDate() === selectedDateObj.getDate();
                                    
                                    const today = new Date();
                                    const isToday = cell.date.getFullYear() === today.getFullYear() &&
                                        cell.date.getMonth() === today.getMonth() &&
                                        cell.date.getDate() === today.getDate();

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleDayClick(cell)}
                                            className={`p-3 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between border cursor-pointer group min-h-[90px] relative ${
                                                cell.isCurrentMonth
                                                    ? isSelected
                                                        ? 'bg-purple-600/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-ink'
                                                        : isToday
                                                            ? 'bg-indigo-600/5 border-indigo-500/30 shadow-sm text-ink'
                                                            : 'bg-surface-2/40 border-line/60 hover:bg-surface-2 hover:border-line hover:scale-[1.02] hover:-translate-y-[1px] text-ink'
                                                    : 'bg-transparent border-transparent text-ink-faint opacity-30 hover:opacity-50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span className={`text-xs font-bold ${
                                                    isSelected ? 'text-purple-400 font-extrabold' :
                                                    isToday ? 'text-indigo-400 font-bold' :
                                                    'text-ink-soft'
                                                }`}>
                                                    {cell.day}
                                                </span>
                                                {isToday && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                )}
                                            </div>

                                            {/* Micro event indicators */}
                                            <div className="space-y-1.5 mt-2 w-full">
                                                {dayEvents.slice(0, 3).map(e => (
                                                    <div
                                                        key={e.id}
                                                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-lg truncate ${
                                                            e.color === 'blue' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/10' :
                                                            e.color === 'red' ? 'bg-red-500/20 text-red-300 border border-red-500/10' :
                                                            e.color === 'green' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/10' :
                                                            'bg-amber-500/20 text-amber-300 border border-amber-500/10'
                                                        }`}
                                                    >
                                                        {e.title.replace(/Meeting:|Deadline:|Leave:|Attendance:/, '')}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <span className="text-[8px] text-ink-soft font-bold pl-1">+{dayEvents.length - 3} more</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                    </div>

                    {/* Right Panel: Selected Day Focus Feed */}
                    <div className="lg:col-span-4 bg-surface-2 border border-line rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="border-b border-line pb-4 font-sans">
                                <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest block">Focus Date Event Summary</h3>
                                <p className="text-sm font-bold text-ink mt-1">
                                    {selectedDateStr || 'Select a day from the grid'}
                                </p>
                            </div>

                            <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {selectedDayEvents.length === 0 ? (
                                    <div className="text-center py-12 flex flex-col items-center justify-center">
                                        <CalendarIcon className="w-10 h-10 text-ink-faint mb-3 opacity-30" />
                                        <p className="text-xs text-ink-soft italic font-medium">No scheduled events on this date.</p>
                                    </div>
                                ) : (
                                    selectedDayEvents.map(e => {
                                        const isMeeting = e.color === 'blue';
                                        const isDeadline = e.color === 'red';
                                        const isLeave = e.color === 'green';
                                        const isAttendance = e.color === 'yellow';

                                        return (
                                            <div key={e.id} className={`p-4 rounded-3xl ${getColorClass(e.color)} flex flex-col gap-2 transition hover:scale-[1.01]`}>
                                                <span className="text-xs font-bold text-ink flex items-center gap-2">
                                                    {isMeeting && <Video className="w-4 h-4 text-blue-400" />}
                                                    {isDeadline && <CheckSquare className="w-4 h-4 text-red-400" />}
                                                    {isLeave && <User className="w-4 h-4 text-emerald-400" />}
                                                    {isAttendance && <CalendarIcon className="w-4 h-4 text-amber-400" />}
                                                    {!isMeeting && !isDeadline && !isLeave && !isAttendance && <Tag className="w-4 h-4 text-indigo-400" />}
                                                    {e.title}
                                                </span>
                                                {e.description && (
                                                    <p className="text-[11px] text-ink-soft leading-normal pl-6">{e.description}</p>
                                                )}
                                                {e.meta && (
                                                    <div className="flex flex-col gap-1 border-t border-line pt-2 mt-1.5 font-mono text-[9px] text-ink-soft pl-6">
                                                        {e.meta.organizer && <span>Host: {e.meta.organizer}</span>}
                                                        {e.meta.link && (
                                                            <a href={e.meta.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                                                                <LinkIcon className="w-3.5 h-3.5" />
                                                                Meeting Link
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="border-t border-line pt-4 mt-6 text-[10px] text-ink-soft font-sans">
                            Meetings scheduled will automatically trigger email invites and agenda updates.
                        </div>
                    </div>
                </div>
            </div>

            {/* SCHEDULE MEETING MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border border-line w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
                        <h2 className="text-lg font-extrabold text-ink mb-5 flex items-center gap-2">
                            <Video className="w-5 h-5 text-purple-400" />
                            Schedule Workspace Meeting
                        </h2>

                        <form onSubmit={handleScheduleMeeting} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Meeting Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sprint Sync, Client Feedback"
                                    value={meetTitle}
                                    onChange={(e) => setMeetTitle(e.target.value)}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-purple-500 text-ink"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Description / Agenda</label>
                                <textarea
                                    placeholder="Agenda description..."
                                    value={meetDesc}
                                    onChange={(e) => setMeetDesc(e.target.value)}
                                    className="w-full bg-surface-2 border border-line rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:border-purple-500 text-ink leading-normal resize-none h-20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Start Date/Time</label>
                                    <input
                                        type="datetime-local"
                                        value={meetStart}
                                        onChange={(e) => setMeetStart(e.target.value)}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-purple-500 text-ink"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">End Date/Time</label>
                                    <input
                                        type="datetime-local"
                                        value={meetEnd}
                                        onChange={(e) => setMeetEnd(e.target.value)}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:border-purple-500 text-ink"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Virtual Room Link (e.g. Google Meet, Zoom)</label>
                                <input
                                    type="url"
                                    placeholder="https://meet.google.com/..."
                                    value={meetLink}
                                    onChange={(e) => setMeetLink(e.target.value)}
                                    className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-purple-500 text-ink"
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-surface-2 hover:bg-surface-3 border border-line text-xs font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-ink"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white rounded-2xl hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceCalendar;
