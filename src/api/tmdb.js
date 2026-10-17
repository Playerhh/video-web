import axios from 'axios';
import { isAbortError } from './http';

const MISSING_KEY_MESSAGE = '未配置电影数据密钥';

export function hasTmdbKey() {
    return Boolean(import.meta.env.VITE_TMDB_API_KEY);
}

export function isTmdbConfigError(error) {
    return error?.code === 'TMDB_CONFIG';
}

const tmdb = axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    timeout: 10000,
    params: {
        language: 'zh-CN',
    },
});

tmdb.interceptors.request.use((config) => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    if (!apiKey) {
        const error = new Error(MISSING_KEY_MESSAGE);
        error.code = 'TMDB_CONFIG';
        return Promise.reject(error);
    }
    config.params = { ...config.params, api_key: apiKey };
    return config;
});

tmdb.interceptors.response.use(
    (response) => response,
    (error) => {
        if (isAbortError(error) || error?.code === 'TMDB_CONFIG') return Promise.reject(error);
        if (error?.response?.status === 401) {
            const configError = new Error(MISSING_KEY_MESSAGE);
            configError.code = 'TMDB_CONFIG';
            return Promise.reject(configError);
        }
        return Promise.reject(error?.response?.data?.status_message || error.message || 'Network Error');
    }
);

export const fetchPopularMovies = async (page = 1, signal) => {
    const response = await tmdb.get('/movie/popular', {
        params: { page },
        signal,
    });
    return response.data;
};

export const fetchMovieDetail = async (id, signal) => {
    const response = await tmdb.get(`/movie/${id}`, {
        params: { append_to_response: 'credits' },
        signal,
    });
    return response.data;
};

export const fetchMovieVideos = async (id, signal, language) => {
    const response = await tmdb.get(`/movie/${id}/videos`, {
        params: language ? { language } : undefined,
        signal,
    });
    return response.data;
};

export const searchMovies = async (keyword, signal) => {
    const response = await tmdb.get('/search/movie', {
        params: { query: keyword },
        signal,
    });
    return response.data;
};

export { MISSING_KEY_MESSAGE };
