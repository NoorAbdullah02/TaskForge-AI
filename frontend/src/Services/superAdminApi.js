import api from './api';

export const getWorkspaces = async () => {
    const response = await api.get('/super-admin/workspaces');
    return response.data;
};

export const toggleSuspendWorkspace = async (id) => {
    const response = await api.post(`/super-admin/workspaces/${id}/suspend`);
    return response.data;
};

export const deleteWorkspace = async (id) => {
    const response = await api.delete(`/super-admin/workspaces/${id}`);
    return response.data;
};

export const getUsers = async () => {
    const response = await api.get('/super-admin/users');
    return response.data;
};

export const getProjects = async () => {
    const response = await api.get('/super-admin/projects');
    return response.data;
};

export const getAnalytics = async () => {
    const response = await api.get('/super-admin/analytics');
    return response.data;
};

export const getAuditLogs = async () => {
    const response = await api.get('/super-admin/audit-logs');
    return response.data;
};

export const toggleBanUser = async (id) => {
    const response = await api.post(`/super-admin/users/${id}/ban`);
    return response.data;
};

export const resetWorkspace = async (id) => {
    const response = await api.post(`/super-admin/workspaces/${id}/reset`);
    return response.data;
};
