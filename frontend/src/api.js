import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Axios instance for backend API calls.
// Handles baseURL and default headers.

export default api;
