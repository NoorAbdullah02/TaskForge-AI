import api from './api';

export const createWorkspace = async (workspaceData) => {
    const response = await api.post('/workspaces/create', workspaceData);
    return response.data;
};

export const joinWorkspace = async (joinData) => {
    const response = await api.post('/workspaces/join', joinData);
    return response.data;
};

export const getUserWorkspaces = async () => {
    const response = await api.get('/workspaces/user-workspaces');
    return response.data;
};

export const switchWorkspace = async (workspaceId) => {
    const response = await api.post('/workspaces/switch', { workspaceId });
    return response.data;
};

export const getPendingRequests = async (workspaceId) => {
    const response = await api.get('/workspaces/requests', {
        headers: { 'x-workspace-id': workspaceId }
    });
    return response.data;
};

export const approveMember = async (workspaceId, membershipId, action) => {
    const response = await api.post('/workspaces/approve', { membershipId, action }, {
        headers: { 'x-workspace-id': workspaceId }
    });
    return response.data;
};

export const updateWorkspaceSettings = async (workspaceId, settingsData) => {
    const response = await api.put('/workspaces/settings', settingsData, {
        headers: { 'x-workspace-id': workspaceId }
    });
    return response.data;
};

export const regenerateInviteCode = async (workspaceId) => {
    const response = await api.post('/workspaces/regenerate-invite', {}, {
        headers: { 'x-workspace-id': workspaceId }
    });
    return response.data;
};

export const getWorkspaceMembers = async () => {
    const response = await api.get('/workspaces/members');
    return response.data;
};

export const getWorkspaceInfo = async () => {
    const response = await api.get('/workspaces/info');
    return response.data;
};

export const bulkApproveMembers = async (workspaceId, membershipIds, action) => {
    const response = await api.post('/workspaces/bulk-approve', { membershipIds, action }, {
        headers: { 'x-workspace-id': workspaceId }
    });
    return response.data;
};
