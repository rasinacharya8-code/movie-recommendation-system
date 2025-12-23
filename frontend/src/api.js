import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a loop to token if we were using JWT, but for now session/basic or simple token logic
// We'll trust the proxy and Django session cookies if using session auth.

// For simple Token auth manually managed (if used):
const token = localStorage.getItem('token');
if (token) {
    // api.defaults.headers.common['Authorization'] = `Token ${token}`;
}

export default api;
