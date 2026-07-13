import api from './api';

export const getPlans = async () => {
    const response = await api.get('/billing/plans');
    return response.data;
};

export const getSubscription = async () => {
    const response = await api.get('/billing/subscription');
    return response.data;
};

export const submitPayment = async (payload) => {
    const response = await api.post('/billing/payments', payload);
    return response.data;
};

export const getPayments = async () => {
    const response = await api.get('/billing/payments');
    return response.data;
};

export const getBillingHistory = async () => {
    const response = await api.get('/billing/history');
    return response.data;
};

export const getInvoices = async () => {
    const response = await api.get('/billing/invoices');
    return response.data;
};

export const downloadInvoicePdf = async (invoiceId) => {
    const response = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    return response.data;
};

export const cancelSubscription = async () => {
    const response = await api.post('/billing/subscription/cancel');
    return response.data;
};
