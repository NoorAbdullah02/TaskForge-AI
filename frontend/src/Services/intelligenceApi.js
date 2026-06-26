import api from './api';

export const recommendAssignee = async (taskId) => {
    const response = await api.post('/intelligence/recommend-assignee', { taskId });
    return response.data;
};

export const getTaskHealth = async (taskId) => {
    const response = await api.get(`/intelligence/tasks/${taskId}/health`);
    return response.data;
};

export const getProjectDependencies = async (projectId) => {
    const response = await api.get(`/intelligence/projects/${projectId}/dependencies`);
    return response.data;
};

export const addDependency = async (taskId, dependsOnTaskId, dependencyType) => {
    const response = await api.post('/intelligence/dependencies', { taskId, dependsOnTaskId, dependencyType });
    return response.data;
};

export const deleteDependency = async (id) => {
    const response = await api.delete(`/intelligence/dependencies/${id}`);
    return response.data;
};

export const getWorkloadBalancer = async (projectId) => {
    const response = await api.get(`/intelligence/projects/${projectId}/workload`);
    return response.data;
};

export const getBurnoutRisk = async (workspaceId) => {
    const response = await api.get(`/intelligence/workspaces/${workspaceId}/burnout`);
    return response.data;
};

export const getProjectHealth = async (projectId) => {
    const response = await api.get(`/intelligence/projects/${projectId}/health`);
    return response.data;
};

export const runEscalationCheck = async () => {
    const response = await api.post('/intelligence/escalation/run-check');
    return response.data;
};
