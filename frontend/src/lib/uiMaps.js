// Single source of truth for status / priority / role styling + labels.
// Light-premium pill classes. Use getX() helpers so unknown values never crash.

export const TASK_STATUS = {
    backlog:       { label: 'Backlog',     pill: 'bg-slate-100 text-slate-700 border-slate-200',   dot: 'bg-slate-400',   badge: 'neutral' },
    todo:          { label: 'To Do',       pill: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500',    badge: 'info' },
    'in-progress': { label: 'In Progress', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500',  badge: 'info' },
    review:        { label: 'In Review',   pill: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500',   badge: 'warning' },
    testing:       { label: 'Testing',     pill: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500',  badge: 'info' },
    done:          { label: 'Completed',   pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',dot: 'bg-emerald-500', badge: 'success' },
    completed:     { label: 'Completed',   pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',dot: 'bg-emerald-500', badge: 'success' },
    archived:      { label: 'Archived',    pill: 'bg-slate-100 text-slate-500 border-slate-200',     dot: 'bg-slate-300',   badge: 'neutral' },
}

export const TASK_PRIORITY = {
    low:      { label: 'Low',      pill: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400',  badge: 'neutral' },
    medium:   { label: 'Medium',   pill: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500',   badge: 'info' },
    high:     { label: 'High',     pill: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', badge: 'warning' },
    critical: { label: 'Critical', pill: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500',    badge: 'danger' },
}

export const ROLES = {
    super_admin: { label: 'Super Admin',     pill: 'bg-purple-50 text-purple-700 border-purple-200' },
    owner:       { label: 'Workspace Owner', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
    admin:       { label: 'Admin',           pill: 'bg-blue-50 text-blue-700 border-blue-200' },
    manager:     { label: 'Project Manager', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    team_leader: { label: 'Team Leader',     pill: 'bg-amber-50 text-amber-700 border-amber-200' },
    employee:    { label: 'Employee',        pill: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const FALLBACK = { label: '—', pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', badge: 'neutral' }

const norm = (v) => String(v ?? '').toLowerCase().trim()

export const getStatus = (v) => TASK_STATUS[norm(v)] || { ...FALLBACK, label: v || '—' }
export const getPriority = (v) => TASK_PRIORITY[norm(v)] || { ...FALLBACK, label: v || '—' }
export const getRole = (v) => ROLES[norm(v)] || { ...FALLBACK, label: v || '—' }

export const CHART_COLORS = {
    brand: '#2563eb',
    accent: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    teal: '#14b8a6',
    pink: '#ec4899',
}

export const CHART_SERIES = [
    '#2563eb', '#7c3aed', '#10b981', '#f59e0b',
    '#ef4444', '#14b8a6', '#ec4899', '#3b82f6',
]
