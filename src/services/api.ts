import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

const CASES_BASE_URL = import.meta.env.VITE_CASES_API_URL || 'http://localhost:5035/api';

export const casesApi = axios.create({
    baseURL: CASES_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Interceptor to automatically attach the access token to casesApi
casesApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
