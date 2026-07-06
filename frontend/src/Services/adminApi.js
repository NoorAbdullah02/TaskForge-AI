import api from './api';

export const getSystemSettings = async () => {
    const response = await api.get('/admin/settings');
    return response.data;
};

export const updateSystemSettings = async (settingsData) => {
    const response = await api.put('/admin/settings', settingsData);
    return response.data;
};

export const getAdminDepartments = async () => {
    const response = await api.get('/admin/departments');
    return response.data;
};

export const createDepartment = async (deptData) => {
    const response = await api.post('/admin/departments', deptData);
    return response.data;
};

export const updateDepartment = async (id, deptData) => {
    const response = await api.put(`/admin/departments/${id}`, deptData);
    return response.data;
};

export const deleteDepartment = async (id) => {
    const response = await api.delete(`/admin/departments/${id}`);
    return response.data;
};

export const getAdminUsers = async () => {
    const response = await api.get('/admin/users');
    return response.data;
};

export const updateUserRoleDept = async (id, roleDeptData) => {
    const response = await api.put(`/admin/users/${id}`, roleDeptData);
    return response.data;
};

export const getAuditLogs = async () => {
    const response = await api.get('/admin/audit-logs');
    return response.data;
};
