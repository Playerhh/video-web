import { create } from 'zustand';
import {
    fetchMovieDetail,
    fetchMovieVideos,
    fetchPopularMovies,
    hasTmdbKey,
    isTmdbConfigError,
    searchMovies,
} from '../api/tmdb';
import { isAbortError } from '../api/http';
import { normalizeMovie, normalizeMovies, normalizeTmdbCast, pickTrailer } from '../utils/show';

const SEARCH_KEY = 'tmdbSearchCache';
const SEARCH_TTL = 30 * 60 * 1000;
const SEARCH_LIMIT = 20;

const pageRuns = new Map();
const detailRuns = new Map();
const trailerRuns = new Map();

function readSearchCache() {
    try {
        const raw = sessionStorage.getItem(SEARCH_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed;
    } catch {
        try {
            sessionStorage.removeItem(SEARCH_KEY);
        } catch {
            // 损坏的电影搜索缓存删不掉时忽略
        }
        return {};
    }
}

function writeSearchCache(cache) {
    try {
        sessionStorage.setItem(SEARCH_KEY, JSON.stringify(cache));
    } catch {
        // 会话空间不足时保留内存缓存
    }
}

function normalizeKeyword(keyword = '') {
    return String(keyword).trim().toLowerCase();
}

function rememberSearch(cache, key, data) {
    const now = Date.now();
    const next = {};
    Object.entries(cache).forEach(([entryKey, value]) => {
        if (!value || !Array.isArray(value.data) || now - value.savedAt > SEARCH_TTL) return;
        if (entryKey !== key) next[entryKey] = value;
    });
    const entries = Object.entries(next).sort((a, b) => (a[1].touchedAt || 0) - (b[1].touchedAt || 0));
    while (entries.length >= SEARCH_LIMIT) {
        const [oldKey] = entries.shift();
        delete next[oldKey];
    }
    next[key] = { savedAt: now, touchedAt: now, data };
    return next;
}

function configMessage(error, fallback) {
    if (isTmdbConfigError(error)) return '未配置电影数据密钥';
    return fallback;
}

const useTmdbStore = create((set, get) => ({
    pages: {},
    totalPages: 1,
    pageLoading: false,
    pageError: '',
    details: {},
    trailers: {},
    movieResults: [],
    movieLoading: false,
    movieError: '',
    movieCache: readSearchCache(),

    loadPopular: async (page, signal) => {
        const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;
        if (!hasTmdbKey()) {
            set({ pageLoading: false, pageError: '未配置电影数据密钥' });
            return;
        }
        if (get().pages[pageNumber]) {
            set({ pageLoading: false, pageError: '' });
            return;
        }
        const run = (pageRuns.get(pageNumber) || 0) + 1;
        pageRuns.set(pageNumber, run);
        set({ pageLoading: true, pageError: '' });
        try {
            const data = await fetchPopularMovies(pageNumber, signal);
            if (signal?.aborted || pageRuns.get(pageNumber) !== run) return;
            set((state) => ({
                pages: { ...state.pages, [pageNumber]: normalizeMovies(data?.results) },
                totalPages: Number(data?.total_pages) || 1,
                pageLoading: false,
                pageError: '',
            }));
        } catch (error) {
            if (signal?.aborted || pageRuns.get(pageNumber) !== run || isAbortError(error)) return;
            set({ pageLoading: false, pageError: configMessage(error, '电影列表加载失败，请重试') });
        }
    },

    loadMovie: async (id, signal) => {
        const movieId = Number(id);
        if (!Number.isInteger(movieId) || movieId <= 0) return;
        if (!hasTmdbKey()) {
            set((state) => ({
                details: { ...state.details, [movieId]: { ...(state.details[movieId] || {}), error: '未配置电影数据密钥', loading: false } },
            }));
            return;
        }
        const current = get().details[movieId];
        if (current?.movie && Array.isArray(current.cast)) return;
        const run = (detailRuns.get(movieId) || 0) + 1;
        detailRuns.set(movieId, run);
        set((state) => ({
            details: { ...state.details, [movieId]: { ...(state.details[movieId] || {}), loading: true, error: '' } },
        }));
        try {
            const data = await fetchMovieDetail(movieId, signal);
            if (signal?.aborted || detailRuns.get(movieId) !== run) return;
            set((state) => ({
                details: {
                    ...state.details,
                    [movieId]: {
                        movie: normalizeMovie(data),
                        cast: normalizeTmdbCast(data?.credits?.cast),
                        loading: false,
                        error: '',
                    },
                },
            }));
        } catch (error) {
            if (signal?.aborted || detailRuns.get(movieId) !== run || isAbortError(error)) return;
            set((state) => ({
                details: {
                    ...state.details,
                    [movieId]: { loading: false, error: configMessage(error, '电影详情加载失败，请重试') },
                },
            }));
        }
    },

    loadTrailer: async (id, signal) => {
        const movieId = Number(id);
        if (!Number.isInteger(movieId) || movieId <= 0) return;
        if (!hasTmdbKey()) {
            set((state) => ({
                trailers: { ...state.trailers, [movieId]: { loaded: true, key: '', error: '未配置电影数据密钥', loading: false } },
            }));
            return;
        }
        if (get().trailers[movieId]?.loaded) return;
        const run = (trailerRuns.get(movieId) || 0) + 1;
        trailerRuns.set(movieId, run);
        set((state) => ({
            trailers: { ...state.trailers, [movieId]: { loading: true, error: '', key: '', loaded: false } },
        }));
        try {
            const chinese = await fetchMovieVideos(movieId, signal, 'zh-CN');
            if (signal?.aborted || trailerRuns.get(movieId) !== run) return;
            let key = pickTrailer(chinese);
            if (!key) {
                const english = await fetchMovieVideos(movieId, signal, 'en-US');
                if (signal?.aborted || trailerRuns.get(movieId) !== run) return;
                key = pickTrailer(english);
            }
            set((state) => ({
                trailers: {
                    ...state.trailers,
                    [movieId]: { loaded: true, key, error: '', loading: false },
                },
            }));
        } catch (error) {
            if (signal?.aborted || trailerRuns.get(movieId) !== run || isAbortError(error)) return;
            set((state) => ({
                trailers: {
                    ...state.trailers,
                    [movieId]: { loaded: false, key: '', loading: false, error: configMessage(error, '预告片加载失败，请重试') },
                },
            }));
        }
    },

    getMovieCache: (keyword) => {
        const key = normalizeKeyword(keyword);
        const hit = get().movieCache[key];
        if (!hit || !Array.isArray(hit.data)) return null;
        if (Date.now() - hit.savedAt > SEARCH_TTL) return null;
        return hit.data;
    },

    searchMovieTitles: async (keyword, signal) => {
        const key = normalizeKeyword(keyword);
        if (!key) {
            set({ movieResults: [], movieLoading: false, movieError: '' });
            return;
        }
        if (!hasTmdbKey()) {
            set({ movieResults: [], movieLoading: false, movieError: '未配置电影数据密钥' });
            return;
        }
        const cached = get().getMovieCache(key);
        if (cached) {
            set({ movieResults: cached, movieLoading: false, movieError: cached.length ? '' : '未找到匹配电影' });
            return;
        }
        set({ movieLoading: true, movieError: '' });
        try {
            const data = await searchMovies(key, signal);
            if (signal?.aborted) return;
            const results = normalizeMovies(data?.results);
            const movieCache = rememberSearch(get().movieCache, key, results);
            set({ movieResults: results, movieLoading: false, movieError: results.length ? '' : '未找到匹配电影', movieCache });
            writeSearchCache(movieCache);
        } catch (error) {
            if (signal?.aborted || isAbortError(error)) return;
            set({ movieLoading: false, movieError: configMessage(error, '电影搜索失败，请稍后重试') });
        }
    },
}));

export default useTmdbStore;
