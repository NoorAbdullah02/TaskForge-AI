import axios from 'axios';

const isDev = import.meta.env.DEV;
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || (isDev ? 'http://localhost:4000/api' : '/api');

const api = axios.create({
    baseURL: apiBaseURL,
    withCredentials: true, // send and receive cookies (httpOnly token)
    timeout: 15000,        // 15 s — fail fast instead of hanging forever
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
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