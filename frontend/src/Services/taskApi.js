import api from './api';

const normalizeTask = (taskOrObj) => {
    if (!taskOrObj) return taskOrObj;
    const task = taskOrObj.task ? taskOrObj.task : taskOrObj;
    let status = task.status;
    if (status === 'approved') status = 'done';
    if (status === 'rejected') status = 'in-progress';
    if (status === 'in_review') status = 'review';
    if (status === 'in_progress') status = 'in-progress';
    
    // Map database properties to frontend property expectations
    const timerStart = task.timerStartedAt || null;
    const isPomodoroActive = task.activePomodoroSession || false;
    const pomodoroStart = task.pomodoroTimerStartedAt || null;
    
    return { 
        ...task, 
        status, 
        timerStart, 
        isPomodoroActive, 
        pomodoroStart 
    };
};

// ─── Core CRUD ─────────────────────────────────────────────────────────────
export const getTasks = async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return Array.isArray(response.data) ? response.data.map(normalizeTask) : response.data;
};

export const getTaskDetails = async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return normalizeTask(response.data);
};

export const createTask = async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return normalizeTask(response.data);
};

export const updateTask = async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return normalizeTask(response.data);
};

export const deleteTask = async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
};

// ─── Subtasks ──────────────────────────────────────────────────────────────
export const createSubtask = async (taskId, title) => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, { title });
    return response.data;
};

export const updateSubtask = async (taskId, subtaskId, subData) => {
    const response = await api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, subData);
    return response.data;
};

export const deleteSubtask = async (taskId, subtaskId) => {
    const response = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return response.data;
};

// ─── Comments ──────────────────────────────────────────────────────────────
export const createComment = async (taskId, content) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { content });
    return response.data;
};

export const deleteComment = async (taskId, commentId) => {
    const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return response.data;
};

// ─── Attachments ───────────────────────────────────────────────────────────
export const createAttachment = async (taskId, attachmentData) => {
    const response = await api.post(`/tasks/${taskId}/attachments`, attachmentData);
    return response.data;
};

export const deleteAttachment = async (taskId, attachmentId) => {
    const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
};

// ─── Lock / Unlock ─────────────────────────────────────────────────────────
export const lockTask = async (taskId) => {
    const response = await api.put(`/tasks/${taskId}/lock`);
    return response.data;
};

export const unlockTask = async (taskId) => {
    const response = await api.put(`/tasks/${taskId}/unlock`);
    return response.data;
};

// ─── Watch / Unwatch ───────────────────────────────────────────────────────
export const watchTask = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/watch`);
    return response.data;
};

export const unwatchTask = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/unwatch`);
    return response.data;
};

// ─── Archive / Restore ─────────────────────────────────────────────────────
export const archiveTask = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/archive`);
    return response.data;
};

export const restoreTask = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/restore`);
    return response.data;
};

// ─── Duplicate ─────────────────────────────────────────────────────────────
export const duplicateTask = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/duplicate`);
    return normalizeTask(response.data);
};

// ─── Timer ─────────────────────────────────────────────────────────────────
export const startTimer = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/timer/start`);
    return normalizeTask(response.data);
};

export const stopTimer = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/timer/stop`);
    return normalizeTask(response.data);
};

// ─── Pomodoro ──────────────────────────────────────────────────────────────
export const startPomodoro = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/pomodoro/start`);
    return normalizeTask(response.data);
};

export const stopPomodoro = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/pomodoro/stop`);
    return normalizeTask(response.data);
};

// ─── Undo / Redo ───────────────────────────────────────────────────────────
export const undoChange = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/undo`);
    return response.data;
};

export const redoChange = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/redo`);
    return response.data;
};

// ─── AI Scores ─────────────────────────────────────────────────────────────
export const getTaskAIScores = async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/ai-scores`);
    return response.data;
};

// ─── Bulk Operations ───────────────────────────────────────────────────────
export const bulkUpdateTasks = async (taskIds, updates) => {
    const response = await api.post('/tasks/bulk-update', { taskIds, updates });
    return response.data;
};

export const bulkDeleteTasks = async (taskIds) => {
    const response = await api.post('/tasks/bulk-delete', { taskIds });
    return response.data;
};

// ─── Templates ─────────────────────────────────────────────────────────────
export const getTemplates = async () => {
    const response = await api.get('/tasks/templates');
    return response.data;
};

export const createTemplate = async (templateData) => {
    const response = await api.post('/tasks/templates', templateData);
    return response.data;
};

export const applyTemplate = async (templateId, projectId) => {
    const response = await api.post(`/tasks/templates/${templateId}/apply`, { projectId });
    return normalizeTask(response.data);
};
