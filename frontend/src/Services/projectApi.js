import api from './api';

const normalizeTask = (task) => {
    if (!task) return task;
    let status = task.status;
    if (status === 'approved') status = 'done';
    if (status === 'rejected') status = 'in-progress';
    if (status === 'in_review') status = 'review';
    if (status === 'in_progress') status = 'in-progress';
    return { ...task, status };
};


export const getProjects = async () => {
    const response = await api.get('/projects');
    return response.data;
};

export const getProjectDetails = async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    const data = response.data;
    if (data) {
        if (Array.isArray(data.tasks)) {
            data.tasks = data.tasks.map(normalizeTask);
        }
        if (Array.isArray(data.milestones)) {
            data.milestones = data.milestones.map(normalizeTask);
        }
    }
    return data;
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
    return normalizeTask(response.data);
};

export const updateTask = async (projectId, taskId, taskData) => {
    const response = await api.put(`/projects/${projectId}/tasks/${taskId}`, taskData);
    return normalizeTask(response.data);
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

export const getProjectsFiltered = async (params) => {
    const response = await api.get('/projects', { params });
    return response.data;
};

export const archiveProject = async (projectId) => {
    const response = await api.put(`/projects/${projectId}/archive`);
    return response.data;
};

export const restoreProject = async (projectId) => {
    const response = await api.put(`/projects/${projectId}/restore`);
    return response.data;
};

export const duplicateProject = async (projectId, name) => {
    const response = await api.post(`/projects/${projectId}/duplicate`, { name });
    return response.data;
};

export const moveProject = async (projectId, { departmentId, targetWorkspaceId }) => {
    const response = await api.put(`/projects/${projectId}/move`, { departmentId, targetWorkspaceId });
    return response.data;
};

export const transferOwnership = async (projectId, targetUserId) => {
    const response = await api.put(`/projects/${projectId}/transfer-ownership`, { targetUserId });
    return response.data;
};

export const joinProject = async ({ inviteCode, password }) => {
    const response = await api.post('/projects/join', { inviteCode, password });
    return response.data;
};

export const exportProjects = async () => {
    const response = await api.get('/projects/export', { responseType: 'blob' });
    return response.data;
};

export const importProjects = async (projectsArray) => {
    const response = await api.post('/projects/import', { projects: projectsArray });
    return response.data;
};

export const assignProjectManager = async (userId, projectId) => {
    const response = await api.post('/workspaces/assign-pm', { userId, projectId });
    return response.data;
};

export const approveTask = async (taskId) => {
    const response = await api.put(`/tasks/${taskId}/approve`);
    return response.data;
};

export const rejectTask = async (taskId, reason) => {
    const response = await api.put(`/tasks/${taskId}/reject`, { reason });
    return response.data;
};
