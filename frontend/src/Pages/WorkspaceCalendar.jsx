import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEvents, scheduleMeeting } from '../Services/calendarApi';
import {
  Calendar as CalendarIcon, Video, Plus, ChevronLeft, ChevronRight,
  Loader2, Link as LinkIcon, Tag, Clock, X, Users, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Event type config ─────────────────────────────────── */
const EVENT_TYPES = {
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    badge: 'bg-blue-500/15 text-blue-700 border border-blue-200',        label: 'Meeting'    },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     badge: 'bg-red-500/15 text-red-700 border border-red-200',            label: 'Deadline'   },
  green:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700 border border-emerald-200', label: 'Attendance' },
  yellow:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   badge: 'bg-amber-400/15 text-amber-700 border border-amber-200',      label: 'Leave'      },
  default: { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400',   badge: 'bg-slate-400/15 text-slate-600 border border-slate-200',      label: 'Event'      },
};
const getType = (color) => EVENT_TYPES[color] ?? EVENT_TYPES.default;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ─── Helpers ─────────────────────────────────────────────── */
function buildCells(year, month) {
  const firstDay  = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotal = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevTotal - i, isCurrentMonth: false, date: new Date(year, month - 1, prevTotal - i) });
  for (let i = 1; i <= totalDays; i++)
    cells.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  let nx = 1;
  while (cells.length < 42)
    cells.push({ day: nx, isCurrentMonth: false, date: new Date(year, month + 1, nx++) });
  return cells;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function stripPrefix(title = '') {
  return title.replace(/^(Meeting:|Deadline:|Leave:|Attendance:)\s*/i, '');
}

/* ─── Component ──────────────────────────────────────────── */
const WorkspaceCalendar = () => {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDesc,  setMeetDesc]  = useState('');
  const [meetStart, setMeetStart] = useState('');
  const [meetEnd,   setMeetEnd]   = useState('');
  const [meetLink,  setMeetLink]  = useState('');

  const [selectedDate,      setSelectedDate]      = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const list = await getEvents();
      setEvents(list || []);
    } catch {
      toast.error('Could not load calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [user?.activeWorkspaceId]);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cells = buildCells(year, month);
  const today = new Date();

  const getEventsForDate = (date) =>
    events.filter(e => sameDay(new Date(e.start), date));

  const handleDayClick = (cell) => {
    setSelectedDate(cell.date);
    setSelectedDayEvents(getEventsForDate(cell.date));
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetTitle || !meetStart || !meetEnd) {
      toast.error('Please fill in title, start time, and end time.');
      return;
    }
    if (new Date(meetStart) > new Date(meetEnd)) {
      toast.error('Start time cannot be after end time.');
      return;
    }
    try {
      setSubmitting(true);
      await scheduleMeeting({
        title: meetTitle.trim(),
        description: meetDesc.trim(),
        startTime: meetStart,
        endTime: meetEnd,
        meetingLink: meetLink.trim(),
      });
      toast.success('Meeting scheduled!');
      setShowModal(false);
      setMeetTitle(''); setMeetDesc(''); setMeetStart(''); setMeetEnd(''); setMeetLink('');
      loadEvents();
    } catch {
      toast.error('Scheduling failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const monthEvents   = events.filter(e => {
    const d = new Date(e.start);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const countByColor = (c) => monthEvents.filter(e => (e.color ?? 'default') === c).length;

  return (
    <div className="min-h-screen bg-surface py-8 px-4 sm:px-6 lg:px-8">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto mb-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand/10 border border-brand/20">
              <CalendarIcon className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">Workspace Calendar</h1>
              <p className="text-sm text-ink-soft mt-0.5">Meetings · Deadlines · Leaves · Attendance</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white
                       text-sm font-semibold hover:bg-brand-strong shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </button>
        </div>

        {/* Legend chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {[['blue','Meeting'],['red','Deadline'],['green','Attendance'],['yellow','Leave']].map(([color, label]) => {
            const t = getType(color);
            const n = countByColor(color);
            return (
              <span key={color} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${t.badge}`}>
                <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                {label}
                {n > 0 && <span className="opacity-60 ml-0.5">· {n}</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* ─── Calendar panel ──────────────────────────────── */}
        <div className="xl:col-span-8 bg-card rounded-3xl border border-line shadow-soft overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-line">
            <h2 className="text-base font-bold text-ink">
              {MONTH_NAMES[month]}{' '}
              <span className="text-ink-faint font-medium">{year}</span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-2 rounded-xl hover:bg-line transition text-ink-soft hover:text-ink cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-ink-soft hover:bg-line transition cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-2 rounded-xl hover:bg-line transition text-ink-soft hover:text-ink cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day-of-week row */}
          <div className="grid grid-cols-7 bg-surface border-b border-line">
            {DAY_NAMES.map(d => (
              <div key={d} className={`py-2.5 text-center text-[11px] font-extrabold uppercase tracking-wider
                ${d === 'Sun' || d === 'Sat' ? 'text-ink-faint' : 'text-ink-soft'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-brand" />
              <span className="text-sm text-ink-soft font-medium">Loading events…</span>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((cell, idx) => {
                const dayEvts   = getEventsForDate(cell.date);
                const isToday   = sameDay(cell.date, today);
                const isSel     = selectedDate && sameDay(cell.date, selectedDate);
                const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                const visible   = dayEvts.slice(0, 3);
                const overflow  = dayEvts.length - 3;
                // last row cells shouldn't show bottom border
                const isLastRow = idx >= 35;

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(cell)}
                    className={[
                      'relative flex flex-col min-h-[96px] p-2 text-left transition-colors cursor-pointer',
                      'border-b border-r border-line focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/30',
                      isLastRow ? 'border-b-0' : '',
                      !cell.isCurrentMonth
                        ? 'bg-surface/60'
                        : isSel
                          ? 'bg-brand/5 ring-2 ring-inset ring-brand/25'
                          : 'bg-card hover:bg-surface',
                    ].join(' ')}
                    aria-label={cell.date.toDateString()}
                  >
                    {/* Day number badge */}
                    <span className={[
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mb-1.5 shrink-0',
                      isToday  ? 'bg-brand text-white shadow-sm' :
                      isSel    ? 'bg-brand/15 text-brand' :
                      cell.isCurrentMonth
                        ? isWeekend ? 'text-ink-faint' : 'text-ink'
                        : 'text-ink-faint opacity-35',
                    ].join(' ')}>
                      {cell.day}
                    </span>

                    {/* Event pills */}
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                      {visible.map(e => {
                        const t = getType(e.color);
                        return (
                          <div key={e.id}
                            className={`flex items-center gap-1 px-1.5 py-[3px] rounded-md text-[11px] font-semibold leading-none truncate w-full ${t.bg} ${t.text}`}
                          >
                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${t.dot}`} />
                            <span className="truncate">{stripPrefix(e.title)}</span>
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <span className="text-[10px] font-semibold text-ink-faint pl-1">+{overflow} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Side panel ──────────────────────────────────── */}
        <div className="xl:col-span-4 flex flex-col gap-4">

          {/* Day detail card */}
          <div className="bg-card rounded-3xl border border-line shadow-soft overflow-hidden flex-1 flex flex-col">

            {/* panel header */}
            <div className="px-5 py-4 bg-surface border-b border-line">
              <p className="text-[10px] font-extrabold text-ink-faint uppercase tracking-widest">Selected Day</p>
              <p className="text-base font-bold text-ink mt-0.5">
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Click a day to inspect'}
              </p>
              {selectedDate && (
                <p className="text-xs text-ink-faint mt-0.5">
                  {selectedDayEvents.length === 0
                    ? 'No events'
                    : `${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {/* event list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[460px]">
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-ink-faint" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-soft">No day selected</p>
                    <p className="text-xs text-ink-faint mt-0.5">Click any date on the grid</p>
                  </div>
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center">
                    <Tag className="w-6 h-6 text-ink-faint" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-soft">All clear</p>
                    <p className="text-xs text-ink-faint mt-0.5">No events on this day</p>
                  </div>
                </div>
              ) : (
                selectedDayEvents.map(e => {
                  const t = getType(e.color);
                  return (
                    <div key={e.id} className={`rounded-2xl p-4 flex flex-col gap-2.5 ${t.bg}`}>
                      {/* title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${t.dot}`} />
                          <span className={`text-sm font-bold leading-snug ${t.text}`}>{e.title}</span>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${t.badge}`}>
                          {t.label}
                        </span>
                      </div>

                      {e.description && (
                        <p className={`text-xs leading-relaxed pl-4 ${t.text} opacity-80`}>{e.description}</p>
                      )}

                      {/* meta */}
                      <div className="flex flex-col gap-1.5 pl-4">
                        {(e.start || e.end) && (
                          <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${t.text} opacity-75`}>
                            <Clock className="w-3 h-3 shrink-0" />
                            {fmtTime(e.start)}{e.end ? ` – ${fmtTime(e.end)}` : ''}
                          </div>
                        )}
                        {e.meta?.organizer && (
                          <div className={`flex items-center gap-1.5 text-[11px] font-medium ${t.text} opacity-70`}>
                            <Users className="w-3 h-3 shrink-0" />
                            {e.meta.organizer}
                          </div>
                        )}
                        {e.meta?.link && (
                          <a href={e.meta.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-brand hover:underline">
                            <LinkIcon className="w-3 h-3 shrink-0" />
                            Join meeting
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* info tip */}
          <div className="bg-brand/5 border border-brand/15 rounded-2xl px-4 py-3 flex items-start gap-3">
            <FileText className="w-4 h-4 text-brand mt-0.5 shrink-0" />
            <p className="text-xs text-ink-soft leading-relaxed">
              Scheduled meetings automatically send email invitations to all workspace members.
            </p>
          </div>
        </div>
      </div>

      {/* ── Schedule Meeting Modal ─────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-line w-full max-w-lg rounded-3xl shadow-float overflow-hidden animate-scale-in">

            {/* modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-surface">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand/10">
                  <Video className="w-5 h-5 text-brand" />
                </div>
                <h2 className="text-base font-extrabold text-ink">Schedule a Meeting</h2>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-line transition text-ink-soft cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="px-6 py-5 space-y-4">

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Meeting Title *</label>
                <input type="text" placeholder="e.g. Sprint Review, Client Sync"
                  value={meetTitle} onChange={e => setMeetTitle(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm font-medium text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 transition" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Agenda / Description</label>
                <textarea placeholder="Optional agenda or notes…" rows={3}
                  value={meetDesc} onChange={e => setMeetDesc(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm font-medium text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Start *</label>
                  <input type="datetime-local" value={meetStart} onChange={e => setMeetStart(e.target.value)}
                    className="w-full bg-surface border border-line rounded-xl px-3 py-3 text-sm text-ink
                               focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">End *</label>
                  <input type="datetime-local" value={meetEnd} onChange={e => setMeetEnd(e.target.value)}
                    className="w-full bg-surface border border-line rounded-xl px-3 py-3 text-sm text-ink
                               focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 transition" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Meeting Link (Zoom / Google Meet)</label>
                <input type="url" placeholder="https://meet.google.com/…"
                  value={meetLink} onChange={e => setMeetLink(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm font-medium text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 transition" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-surface border border-line text-sm font-semibold text-ink-soft
                             rounded-xl hover:bg-line transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-brand text-white text-sm font-bold rounded-xl
                             hover:bg-brand-strong shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'Scheduling…' : 'Schedule Meeting'}
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
