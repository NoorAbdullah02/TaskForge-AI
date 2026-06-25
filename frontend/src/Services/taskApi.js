import api from './api';

export const getTasks = async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
};

export const getTaskDetails = async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
};

export const createTask = async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
};

export const updateTask = async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
};

export const deleteTask = async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
};

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

export const createComment = async (taskId, content) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { content });
    return response.data;
};

export const deleteComment = async (taskId, commentId) => {
    const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return response.data;
};

export const createAttachment = async (taskId, attachmentData) => {
    const response = await api.post(`/tasks/${taskId}/attachments`, attachmentData);
    return response.data;
};

export const deleteAttachment = async (taskId, attachmentId) => {
    const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
};
