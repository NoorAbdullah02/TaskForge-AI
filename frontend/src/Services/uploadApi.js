import api from './api';

export const uploadFile = async (file, folder = 'taskforge') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const deleteFile = async (fileId) => {
    const response = await api.delete(`/upload/${fileId}`);
    return response.data;
};
