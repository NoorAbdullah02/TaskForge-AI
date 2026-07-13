import { useState, useRef } from 'react';
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

    // dnd-kit resets `transform` to null once a drag ends, before the resulting
    // click event reaches this element — so we can't use transform to detect a
    // just-finished drag. Instead, measure pointer movement directly between
    // down and up, independent of dnd-kit's own drag-activation state.
    const pointerDownPos = useRef(null);

    const handlePointerDown = (e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
        listeners.onPointerDown?.(e);
    };

    const handlePointerUp = (e) => {
        const start = pointerDownPos.current;
        pointerDownPos.current = null;
        listeners.onPointerUp?.(e);
        if (start && Math.abs(e.clientX - start.x) < 5 && Math.abs(e.clientY - start.y) < 5) {
            onClick(task.id);
        }
    };

    const workTypeInfo = WORK_TYPE_ICONS[task.workType] || WORK_TYPE_ICONS.task;
    const WorkTypeIcon = workTypeInfo.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="bg-card p-4 rounded-2xl shadow-soft border border-line hover:shadow-float hover:-translate-y-0.5 transition-all duration-300 cursor-grab active:cursor-grabbing space-y-3 relative group"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${workTypeInfo.bg}`}>
                        <WorkTypeIcon className={`w-3.5 h-3.5 ${workTypeInfo.color}`} />
                    </div>
                    <div>
                        <h5 className="font-bold text-ink leading-snug line-clamp-2">{task.title}</h5>
                        {task.isTimerActive && (
                            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[8.5px] font-black uppercase tracking-wider animate-pulse">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                                ⏱️ Tracking
                            </span>
                        )}
                        {task.isPomodoroActive && (
                            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/25 text-[8.5px] font-black uppercase tracking-wider animate-pulse">
                                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full shrink-0" />
                                🍅 Focus session
                            </span>
                        )}
                    </div>
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

function KanbanColumn({ status, title, wipLimit, tasks, priorityColors, onCardClick, color }) {
    const { isOver, setNodeRef } = useDroppable({
        id: status,
    });

    const limitExceeded = wipLimit && tasks.length > wipLimit;

    return (
        <div
            ref={setNodeRef}
            className={`bg-surface-2/45 rounded-3xl p-4 border border-line transition-all duration-300 flex-1 min-w-[250px] flex flex-col ${
                isOver ? 'border-dashed border-blue-400 bg-blue-500/10 shadow-inner' : ''
            } ${limitExceeded ? 'border-red-500/40 bg-red-500/5' : ''}`}
        >
            <div className="flex justify-between items-center mb-4 px-1">
                <h4 className="font-extrabold text-ink-soft uppercase tracking-wider text-xs flex items-center gap-1.5 truncate max-w-[150px]" title={title}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                    <span className="truncate">{title}</span>
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={`bg-line border border-line text-ink font-bold px-2 py-0.5 rounded-full text-[10px] shadow-sm ${
                        limitExceeded ? 'border-red-500 text-red-500 bg-red-500/10' : ''
                    }`}>
                        {tasks.length}{wipLimit ? ` / ${wipLimit}` : ''}
                    </span>
                    {limitExceeded && (
                        <span className="text-[9px] text-red-500 font-extrabold uppercase animate-pulse select-none" title="WIP Limit Exceeded">WIP!</span>
                    )}
                </div>
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


export default function KanbanBoard({ tasks, setTasks, onCardClick, priorityColors, columnsConfig }) {
    const [activeTask, setActiveTask] = useState(null);
    const activeWorkTypeInfo = activeTask ? (WORK_TYPE_ICONS[activeTask.workType] || WORK_TYPE_ICONS.task) : null;
    const ActiveWorkTypeIcon = activeWorkTypeInfo ? activeWorkTypeInfo.icon : null;

    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 8,
        },
    });

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
            const columnLabel = columnsConfig.find(c => c.key === newStatus)?.label || newStatus;
            toast.success(`Task moved to ${columnLabel}`);
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
            <div className="flex gap-5 overflow-x-auto pb-6 select-none scrollbar-thin">
                {columnsConfig.filter(c => c.visible).map((col) => {
                    const columnTasks = tasks.filter((t) => t.status === col.key);
                    return (
                        <KanbanColumn
                            key={col.key}
                            status={col.key}
                            title={col.label}
                            wipLimit={col.wipLimit}
                            tasks={columnTasks}
                            priorityColors={priorityColors}
                            onCardClick={onCardClick}
                            color={col.color}
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
