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

export const getSuperAdminPayments = async (params = {}) => {
    const response = await api.get('/super-admin/payments', { params });
    return response.data;
};

export const approvePayment = async (id) => {
    const response = await api.post(`/super-admin/payments/${id}/approve`);
    return response.data;
};

export const rejectPayment = async (id, reason) => {
    const response = await api.post(`/super-admin/payments/${id}/reject`, { reason });
    return response.data;
};

export const bulkApprovePayments = async (paymentIds) => {
    const response = await api.post('/super-admin/payments/bulk-approve', { paymentIds });
    return response.data;
};

export const bulkRejectPayments = async (paymentIds, reason) => {
    const response = await api.post('/super-admin/payments/bulk-reject', { paymentIds, reason });
    return response.data;
};

export const getBillingAnalytics = async () => {
    const response = await api.get('/super-admin/billing-analytics');
    return response.data;
};
