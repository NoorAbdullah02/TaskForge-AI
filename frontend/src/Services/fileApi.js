import api from './api';

export const getVersions = async (fileId) => {
    const response = await api.get(`/files/${fileId}/versions`);
    return response.data;
};

export const addVersion = async (fileId, data) => {
    const response = await api.post(`/files/${fileId}/versions`, data);
    return response.data;
};

export const trackDownload = async (fileId) => {
    const response = await api.post(`/files/${fileId}/downloads`);
    return response.data;
};

export const getDownloads = async (fileId) => {
    const response = await api.get(`/files/${fileId}/downloads`);
    return response.data;
};
