import axios from 'axios';

const API_URL = '/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add Admin Token if present
apiClient.interceptors.request.use((config) => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        config.headers['X-Admin-Token'] = adminToken;
    }
    return config;
});
