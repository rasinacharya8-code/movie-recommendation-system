import axios from 'axios';

const api = axios.create({
  baseURL: 'https://movie-recommendation-system-ny96.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios instance for backend API calls.
// Handles baseURL and default headers.

export default api;
