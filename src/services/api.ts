import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5240/api';

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

// OData routes are registered at the root level, not under /api
const ODATA_BASE_URL = CASES_BASE_URL.replace(/\/api$/, '');

export const odataApi = axios.create({
    baseURL: ODATA_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Attach token to OData requests as well
odataApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:5223/api';

export const aiApi = axios.create({
    baseURL: AI_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Interceptor to automatically attach the access token to aiApi
aiApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
