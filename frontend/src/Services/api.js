import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
    withCredentials: true, // send and receive cookies (httpOnly token)
});

// 401 → fire a custom event so AuthContext can react (no circular import needed)
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            // Only fire if not already on an auth route to avoid redirect loops
            const url = err?.config?.url || '';
            const isAuthRoute = url.includes('/login') || url.includes('/me') || url.includes('/refresh');
            if (!isAuthRoute) {
                window.dispatchEvent(new CustomEvent('auth:expired'));
            }
        }
        return Promise.reject(err);
    }
);

export default api;