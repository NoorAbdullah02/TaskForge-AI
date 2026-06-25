import api from './api';

export const getProjects = async () => {
    const response = await api.get('/projects');
    return response.data;
};

export const getProjectDetails = async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
};

export const createProject = async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
};

export const updateProject = async (projectId, projectData) => {
    const response = await api.put(`/projects/${projectId}`, projectData);
    return response.data;
};

export const deleteProject = async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
};

export const assignMember = async (projectId, { email, role }) => {
    const response = await api.post(`/projects/${projectId}/members`, { email, role });
    return response.data;
};

export const removeMember = async (projectId, userId) => {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
};

export const createTask = async (projectId, taskData) => {
    const response = await api.post(`/projects/${projectId}/tasks`, taskData);
    return response.data;
};

export const updateTask = async (projectId, taskId, taskData) => {
    const response = await api.put(`/projects/${projectId}/tasks/${taskId}`, taskData);
    return response.data;
};

export const deleteTask = async (projectId, taskId) => {
    const response = await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
};

export const getProjectDocuments = async (projectId) => {
    const response = await api.get(`/projects/${projectId}/documents`);
    return response.data;
};

export const addProjectDocument = async (projectId, docData) => {
    const response = await api.post(`/projects/${projectId}/documents`, docData);
    return response.data;
};

export const deleteProjectDocument = async (projectId, docId) => {
    const response = await api.delete(`/projects/${projectId}/documents/${docId}`);
    return response.data;
};
