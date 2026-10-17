import axios from 'axios';

const http = axios.create({
    baseURL: 'https://api.tvmaze.com',
    timeout: 10000,
    headers: {
        Accept: 'application/json',
    },
});

export function isAbortError(error) {
    return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';
}

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (isAbortError(error)) return Promise.reject(error);
        return Promise.reject(error?.response?.data || error.message || 'Network Error');
    }
);

export default http;
