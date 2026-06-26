import api from './api';

export const getPages = async (type) => {
    const url = type ? `/kb/pages?type=${type}` : '/kb/pages';
    const response = await api.get(url);
    return response.data;
};

export const createPage = async (data) => {
    const response = await api.post('/kb/pages', data);
    return response.data;
};

export const updatePage = async (id, data) => {
    const response = await api.put(`/kb/pages/${id}`, data);
    return response.data;
};

export const deletePage = async (id) => {
    const response = await api.delete(`/kb/pages/${id}`);
    return response.data;
};
