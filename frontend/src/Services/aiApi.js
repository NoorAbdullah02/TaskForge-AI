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
