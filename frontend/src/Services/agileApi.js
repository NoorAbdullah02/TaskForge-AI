import api from './api';

// Team Endpoints
export const getTeams = async () => {
    const response = await api.get('/agile/teams');
    return response.data;
};

export const createTeam = async (data) => {
    const response = await api.post('/agile/teams', data);
    return response.data;
};

export const updateTeam = async (id, data) => {
    const response = await api.put(`/agile/teams/${id}`, data);
    return response.data;
};

export const deleteTeam = async (id) => {
    const response = await api.delete(`/agile/teams/${id}`);
    return response.data;
};

export const getTeamMembers = async (teamId) => {
    const response = await api.get(`/agile/teams/${teamId}/members`);
    return response.data;
};

export const addTeamMember = async (teamId, userId) => {
    const response = await api.post(`/agile/teams/${teamId}/members/add`, { userId });
    return response.data;
};

export const removeTeamMember = async (teamId, userId) => {
    const response = await api.post(`/agile/teams/${teamId}/members/remove`, { userId });
    return response.data;
};

// Epic Endpoints
export const getEpics = async (projectId) => {
    const response = await api.get('/agile/epics', { params: { projectId } });
    return response.data;
};

export const createEpic = async (data) => {
    const response = await api.post('/agile/epics', data);
    return response.data;
};

export const updateEpic = async (id, data) => {
    const response = await api.put(`/agile/epics/${id}`, data);
    return response.data;
};

export const deleteEpic = async (id) => {
    const response = await api.delete(`/agile/epics/${id}`);
    return response.data;
};

// Story Endpoints
export const getStories = async ({ epicId, projectId }) => {
    const response = await api.get('/agile/stories', { params: { epicId, projectId } });
    return response.data;
};

export const createStory = async (data) => {
    const response = await api.post('/agile/stories', data);
    return response.data;
};

export const updateStory = async (id, data) => {
    const response = await api.put(`/agile/stories/${id}`, data);
    return response.data;
};

export const deleteStory = async (id) => {
    const response = await api.delete(`/agile/stories/${id}`);
    return response.data;
};

// Sprint Endpoints
export const getSprints = async (projectId) => {
    const response = await api.get('/agile/sprints', { params: { projectId } });
    return response.data;
};

export const createSprint = async (data) => {
    const response = await api.post('/agile/sprints', data);
    return response.data;
};

export const updateSprint = async (id, data) => {
    const response = await api.put(`/agile/sprints/${id}`, data);
    return response.data;
};

export const deleteSprint = async (id) => {
    const response = await api.delete(`/agile/sprints/${id}`);
    return response.data;
};

export const startSprint = async (id) => {
    const response = await api.put(`/agile/sprints/${id}/start`);
    return response.data;
};

export const completeSprint = async (id) => {
    const response = await api.put(`/agile/sprints/${id}/complete`);
    return response.data;
};
