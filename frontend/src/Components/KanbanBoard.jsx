import { useState } from 'react';
import {
    DndContext,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    DragOverlay,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trophy, Calendar, Sparkles, CheckSquare, HelpCircle, Megaphone, UserPlus, FileImage } from 'lucide-react';
import { updateTask } from '../Services/taskApi';
import toast from 'react-hot-toast';

const WORK_TYPE_ICONS = {
    task: { icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    request: { icon: HelpCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    campaign: { icon: Megaphone, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    candidate: { icon: UserPlus, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    asset: { icon: FileImage, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
};

function KanbanTaskCard({ task, onClick, priorityColors }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: {
            task,
        },
    });

    const style = {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.3 : undefined,
    };

    // A click handler that ensures dragging action doesn't conflict with normal click events
    const handleCardClick = (_e) => {
        // Prevent click if we were dragging
        if (transform && (Math.abs(transform.x) > 2 || Math.abs(transform.y) > 2)) {
            return;
        }
        onClick(task.id);
    };

    const workTypeInfo = WORK_TYPE_ICONS[task.workType] || WORK_TYPE_ICONS.task;
    const WorkTypeIcon = workTypeInfo.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleCardClick}
            className="bg-card p-4 rounded-2xl shadow-soft border border-line hover:shadow-float hover:-translate-y-0.5 transition-all duration-300 cursor-grab active:cursor-grabbing space-y-3 relative group"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${workTypeInfo.bg}`}>
                        <WorkTypeIcon className={`w-3.5 h-3.5 ${workTypeInfo.color}`} />
                    </div>
                    <h5 className="font-bold text-ink leading-snug line-clamp-2">{task.title}</h5>
                </div>
                {task.isMilestone && <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />}
            </div>
            <p className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20 w-fit">
                {task.projectName}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-3 text-xxs border-t border-line">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-extrabold uppercase border text-[9px] shrink-0 ${priorityColors[task.priority] || priorityColors.medium}`}>
                        {task.priority}
                    </span>
                    {task.assigneeName && (
                        <span className="bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full text-[9px] flex items-center gap-0.5 border border-blue-500/20 min-w-0 max-w-[110px]">
                            <span className="shrink-0">👤</span>
                            <span className="truncate">{task.assigneeName}</span>
                        </span>
                    )}
                </div>
                {task.dueDate && (
                    <span className="text-ink-soft font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap ml-auto">
                        <Calendar className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
}

function KanbanColumn({ status, title, tasks, priorityColors, onCardClick }) {
    const { isOver, setNodeRef } = useDroppable({
        id: status,
    });

    return (
        <div
            ref={setNodeRef}
            className={`bg-surface-2/45 rounded-3xl p-4 border border-line transition-all duration-300 flex-1 min-w-[250px] flex flex-col ${
                isOver ? 'border-dashed border-blue-400 bg-blue-500/10 shadow-inner' : ''
            }`}
        >
            <div className="flex justify-between items-center mb-4 px-1">
                <h4 className="font-extrabold text-ink-soft uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                        status === 'backlog' ? 'bg-slate-500' :
                        status === 'todo' ? 'bg-blue-500' :
                        status === 'in-progress' ? 'bg-amber-500 animate-pulse' :
                        status === 'review' ? 'bg-purple-500' :
                        'bg-emerald-500'
                    }`} />
                    {title}
                </h4>
                <span className="bg-surface-3 border border-line text-ink font-bold px-2.5 py-0.5 rounded-full text-[10px] shadow-sm">
                    {tasks.length}
                </span>
            </div>

            <div className="space-y-3 flex-1 min-h-[350px]">
                {tasks.map((task) => (
                    <KanbanTaskCard
                        key={task.id}
                        task={task}
                        onClick={onCardClick}
                        priorityColors={priorityColors}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed border-line rounded-2xl bg-surface-2/20 select-none">
                        <Sparkles className="w-6 h-6 text-ink-faint/30 mb-2" />
                        <p className="text-center text-ink-soft text-xs font-semibold">Drop tasks here</p>
                    </div>
                )}
            </div>
        </div>
    );
}


export default function KanbanBoard({ tasks, setTasks, onCardClick, priorityColors, statusStates, statusTitles }) {
    const [activeTask, setActiveTask] = useState(null);
    const activeWorkTypeInfo = activeTask ? (WORK_TYPE_ICONS[activeTask.workType] || WORK_TYPE_ICONS.task) : null;
    const ActiveWorkTypeIcon = activeWorkTypeInfo ? activeWorkTypeInfo.icon : null;

    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 8,
        },
    });

    // TouchSensor requires holding 180ms before initiating to prevent conflicting with scroll gestures
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 180,
            tolerance: 6,
        },
    });

    const sensors = useSensors(mouseSensor, touchSensor);

    const handleDragStart = (event) => {
        const { active } = event;
        const task = tasks.find((t) => t.id === active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id;
        const newStatus = over.id;

        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        if (task.status === newStatus) return;

        const oldStatus = task.status;

        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                t.id === taskId ? { ...t, status: newStatus } : t
            )
        );

        try {
            await updateTask(taskId, { status: newStatus });
            toast.success(`Task moved to ${statusTitles[newStatus] || newStatus}`);
        } catch (error) {
            console.error('Failed to update task status:', error);
            toast.error('Failed to update status on server. Rolling back...');
            
            setTasks((prevTasks) =>
                prevTasks.map((t) =>
                    t.id === taskId ? { ...t, status: oldStatus } : t
                )
            );
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 overflow-x-auto pb-6">
                {statusStates.map((st) => {
                    const columnTasks = tasks.filter((t) => t.status === st);
                    return (
                        <KanbanColumn
                            key={st}
                            status={st}
                            title={statusTitles[st]}
                            tasks={columnTasks}
                            priorityColors={priorityColors}
                            onCardClick={onCardClick}
                        />
                    );
                })}
            </div>

            <DragOverlay adjustScale={true}>
                {activeTask && ActiveWorkTypeIcon && activeWorkTypeInfo ? (
                    <div className="bg-card p-4 rounded-2xl shadow-xl border-2 border-blue-500 scale-105 opacity-90 cursor-grabbing space-y-3 relative select-none pointer-events-none">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                                <div className={`p-1.5 rounded-lg border shrink-0 ${activeWorkTypeInfo.bg}`}>
                                    <ActiveWorkTypeIcon className={`w-3.5 h-3.5 ${activeWorkTypeInfo.color}`} />
                                </div>
                                <h5 className="font-bold text-ink line-clamp-2">{activeTask.title}</h5>
                            </div>
                            {activeTask.isMilestone && <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 w-fit">
                            {activeTask.projectName}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-2 text-xxs border-t border-line">
                            <span className={`px-2 py-0.5 rounded font-extrabold uppercase border shrink-0 ${priorityColors[activeTask.priority] || priorityColors.medium}`}>
                                {activeTask.priority}
                            </span>
                            {activeTask.dueDate && (
                                <span className="text-ink-soft font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap ml-auto">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    {new Date(activeTask.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
