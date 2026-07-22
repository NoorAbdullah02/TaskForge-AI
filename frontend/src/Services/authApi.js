import api from './api';

export const registerUser = async (userData) => {
    const response = await api.post('/users/register', userData);
    return response.data;

}

export const checkEmailExists = async (email) => {
    try {
        const response = await api.post('/users/check-email', { email });
        return response.data.exists;
    } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Unable to verify email. Please try again.';
        throw new Error(message);
    }
}

export const checkEmailStatus = async (email) => {
    try {
        const response = await api.post('/users/check-email', { email });
        return response.data; // { exists: boolean, isEmailVerified: boolean }
    } catch (err) {
        return { exists: false, isEmailVerified: false };
    }
}

export const loginUser = async (userData) => {
    try {
        const response = await api.post('/users/login', userData);
        return response.data;
    } catch (err) {
        if (err?.response?.data) {
            const message = err.response.data.message || 'Login failed';
            const error = new Error(message);
            error.response = err.response;
            throw error;
        }
        throw err;
    }
}

export const logoutUser = async () => {
    const response = await api.post('/users/logout');
    return response.data;
}


export const getUserProfile = async () => {
    const response = await api.get('/users/profile');
    return response.data;
}

export const sendVerificationEmail = async () => {
    const response = await api.post('/users/send-verification-email');
    return response.data;
}

export const verifyEmailToken = async ({ email, token }) => {
    const response = await api.post('/users/verify-email-token', { email, token });
    return response.data;
}

export const resendVerificationEmail = async (email) => {
    const response = await api.post('/users/resend-verification-email', { email });
    return response.data;
}

export const updateUserName = async ({ name }) => {

    const response = await api.put('/users/update-name', { name });
    return response.data;

}

export const updateUserPassword = async ({ currentPassword, newPassword }) => {
    const response = await api.put('/users/update-password', { currentPassword, newPassword });
    return response.data;
}

export const confirmResetPassword = async ({ email, token, newPassword }) => {
    const response = await api.post('/users/reset-password', { email, token, newPassword });
    return response.data;
}

export const requestPasswordReset = async (email) => {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
}

export const updateUserAvatar = async ({ avatarUrl }) => {
    const response = await api.put('/users/update-avatar', { avatarUrl });
    return response.data;
}

export const verify2Fa = async ({ email, otp }) => {
    const response = await api.post('/users/verify-2fa', { email, otp });
    return response.data;
}

export const toggle2Fa = async (enable) => {
    const response = await api.put('/users/toggle-2fa', { enable });
    return response.data;
}

export const updateUserProfile = async (profileData) => {
    const response = await api.put('/users/update-profile', profileData);
    return response.data;
}

export const getDepartments = async () => {
    const response = await api.get('/users/departments');
    return response.data;
}

export const getSetupStatus = async () => {
    const response = await api.get('/users/setup-status');
    return response.data;
}

export const getUserSessions = async () => {
    const response = await api.get('/users/sessions');
    return response.data;
}

export const revokeSession = async (id) => {
    const response = await api.delete(`/users/sessions/${id}`);
    return response.data;
}

export const getUserActivityLogs = async () => {
    const response = await api.get('/users/activity-logs');
    return response.data;
}

export const getApiKeys = async () => {
    const response = await api.get('/users/api-keys');
    return response.data;
}

export const createApiKey = async (name) => {
    const response = await api.post('/users/api-keys', { name });
    return response.data;
}

export const revokeApiKey = async (id) => {
    const response = await api.delete(`/users/api-keys/${id}`);
    return response.data;
}