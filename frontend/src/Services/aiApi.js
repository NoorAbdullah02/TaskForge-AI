import api from './api';

export const generateTasks = async (projectDescription) => {
    const response = await api.post('/ai/generate-tasks', { projectDescription });
    return response.data;
};

export const summarizeMeeting = async (meetingNotes) => {
    const response = await api.post('/ai/summarize-meeting', { meetingNotes });
    return response.data;
};

export const askCopilot = async (message, history = []) => {
    const response = await api.post('/ai/copilot', { message, history });
    return response.data;
};

export const planSprint = async (sprintName, goal, tasksList) => {
    const response = await api.post('/ai/plan-sprint', { sprintName, goal, tasksList });
    return response.data;
};

export const generateDocs = async (docType, topicDescription) => {
    const response = await api.post('/ai/generate-docs', { docType, topicDescription });
    return response.data;
};

export const analyzeRisks = async (projectId) => {
    const response = await api.post('/ai/analyze-risks', { projectId });
    return response.data;
};

export const sendWeeklySummary = async () => {
    const response = await api.post('/ai/weekly-summary');
    return response.data;
};

// New AI & ML Sprint endpoints
export const planSprintV2 = async (projectDescription) => {
    const response = await api.post('/ai/plan-sprint-v2', { projectDescription });
    return response.data;
};

export const getResourcePlanner = async (projectId) => {
    const response = await api.get(`/ai/resource-planner/${projectId}`);
    return response.data;
};

export const predictDeadline = async (type, id) => {
    const response = await api.get(`/ai/predict-deadline/${type}/${id}`);
    return response.data;
};

export const predictProjectSuccess = async (projectId) => {
    const response = await api.get(`/ai/predict-project-success/${projectId}`);
    return response.data;
};

export const predictProductivity = async (userId) => {
    const response = await api.get(`/ai/predict-productivity/${userId}`);
    return response.data;
};

export const getDailyStandup = async (regenerate = false) => {
    const response = await api.get(`/ai/daily-standup${regenerate ? '?regenerate=true' : ''}`);
    return response.data;
};

export const getExecutiveStats = async () => {
    const response = await api.get('/ai/executive-stats');
    return response.data;
};

export const askEnterpriseCopilot = async (message, history = []) => {
    const response = await api.post('/ai/enterprise/copilot', { message, history });
    return response.data;
};

export const detectBurnout = async (targetUserId = null) => {
    const response = await api.post('/ai/enterprise/burnout-detect', { targetUserId });
    return response.data;
};

export const detectTeamBurnout = async (projectId) => {
    const response = await api.get(`/ai/enterprise/burnout-team/${projectId}`);
    return response.data;
};

export const getHealthScore = async (type, id) => {
    const response = await api.get(`/ai/enterprise/health-score/${type}/${id}`);
    return response.data;
};

export const emailAssist = async (context, tone) => {
    const response = await api.post('/ai/enterprise/email-assist', { context, tone });
    return response.data;
};

export const getWeeklyReport = async () => {
    const response = await api.get('/ai/enterprise/weekly-report');
    return response.data;
};

export const smartAssign = async (taskId) => {
    const response = await api.get(`/ai/enterprise/smart-assign/${taskId}`);
    return response.data;
};

export const getRoleDashboard = async () => {
    const response = await api.get('/ai/enterprise/role-dashboard');
    return response.data;
};

