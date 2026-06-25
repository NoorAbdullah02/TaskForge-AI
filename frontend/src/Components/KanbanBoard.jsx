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
import { Trophy, Calendar, Sparkles } from 'lucide-react';
import { updateTask } from '../Services/taskApi';
import toast from 'react-hot-toast';

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
    const handleCardClick = (e) => {
        // Prevent click if we were dragging
        if (transform && (Math.abs(transform.x) > 2 || Math.abs(transform.y) > 2)) {
            return;
        }
        onClick(task.id);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleCardClick}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-150 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing space-y-3 relative group"
        >
            <div className="flex items-start justify-between">
                <h5 className="font-bold text-gray-800 line-clamp-2 pr-2">{task.title}</h5>
                {task.isMilestone && <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />}
            </div>
            <p className="text-xxs font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                {task.projectName}
            </p>

            <div className="flex justify-between items-center pt-2 text-xxs border-t border-gray-50">
                <span className={`px-2 py-0.5 rounded font-extrabold uppercase border ${priorityColors[task.priority] || priorityColors.medium}`}>
                    {task.priority}
                </span>
                {task.dueDate && (
                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-450" />
                        {new Date(task.dueDate).toLocaleDateString()}
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
            className={`bg-gray-50 rounded-3xl p-4 border-2 transition-all duration-200 flex-1 min-w-[250px] flex flex-col ${
                isOver ? 'border-dashed border-blue-400 bg-blue-50/30 shadow-inner' : 'border-gray-200/50'
            }`}
        >
            <div className="flex justify-between items-center mb-4 px-1">
                <h4 className="font-extrabold text-gray-700 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                        status === 'backlog' ? 'bg-gray-400' :
                        status === 'todo' ? 'bg-blue-400' :
                        status === 'in-progress' ? 'bg-amber-450 animate-pulse' :
                        status === 'review' ? 'bg-indigo-400' :
                        'bg-emerald-400'
                    }`} />
                    {title}
                </h4>
                <span className="bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full text-xxs">
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
                    <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed border-gray-200 rounded-2xl bg-white/20 select-none">
                        <Sparkles className="w-6 h-6 text-gray-300 mb-2" />
                        <p className="text-center text-gray-400 text-xs font-semibold">Drop tasks here</p>
                    </div>
                )}
            </div>
        </div>
    );
}


export default function KanbanBoard({ tasks, setTasks, onCardClick, priorityColors, statusStates, statusTitles }) {
    const [activeTask, setActiveTask] = useState(null);

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
                {activeTask ? (
                    <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-blue-500 scale-105 opacity-90 cursor-grabbing space-y-3 relative select-none pointer-events-none">
                        <div className="flex items-start justify-between">
                            <h5 className="font-bold text-gray-800 line-clamp-2 pr-2">{activeTask.title}</h5>
                            {activeTask.isMilestone && <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />}
                        </div>
                        <p className="text-xxs font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                            {activeTask.projectName}
                        </p>

                        <div className="flex justify-between items-center pt-2 text-xxs border-t border-gray-50">
                            <span className={`px-2 py-0.5 rounded font-extrabold uppercase border ${priorityColors[activeTask.priority] || priorityColors.medium}`}>
                                {activeTask.priority}
                            </span>
                            {activeTask.dueDate && (
                                <span className="text-gray-400 font-semibold flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(activeTask.dueDate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
