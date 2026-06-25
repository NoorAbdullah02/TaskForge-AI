import api from './api';

export const applyLeave = async (leaveData) => {
    const response = await api.post('/leaves', leaveData);
    return response.data;
};

export const getLeaveHistory = async () => {
    const response = await api.get('/leaves/history');
    return response.data;
};

export const getAllLeaveRequests = async () => {
    const response = await api.get('/leaves/requests');
    return response.data;
};

export const approveLeave = async (leaveId) => {
    const response = await api.patch(`/leaves/${leaveId}/approve`);
    return response.data;
};

export const rejectLeave = async (leaveId) => {
    const response = await api.patch(`/leaves/${leaveId}/reject`);
    return response.data;
};
