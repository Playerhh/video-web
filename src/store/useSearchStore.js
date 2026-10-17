/**
 * 全局状态管理 - 使用 Zustand
 * 搜索结果缓存放在 sessionStorage，30 分钟过期，最多 20 个关键词
 */
import { create } from 'zustand';
import { normalizeShows } from '../utils/show';

const CACHE_KEY = 'searchResultCache';
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_LIMIT = 20;

export function normalizeKeyword(keyword = '') {
    return String(keyword).trim().toLowerCase();
}

function readCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return pruneCache(parsed, Date.now());
    } catch {
        try {
            sessionStorage.removeItem(CACHE_KEY);
        } catch {
            // 缓存损坏时忽略删除失败
        }
        return {};
    }
}

function writeCache(cache) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
        // 会话空间不足时保留内存缓存
    }
}

function pruneCache(cache, now) {
    const next = {};
    Object.entries(cache).forEach(([key, value]) => {
        if (!value || !Array.isArray(value.data) || typeof value.savedAt !== 'number') return;
        if (now - value.savedAt > CACHE_TTL) return;
        next[key] = value;
    });
    return next;
}

function remember(cache, key, data) {
    const now = Date.now();
    const next = pruneCache(cache, now);
    delete next[key];
    const entries = Object.entries(next).sort((a, b) => (a[1].touchedAt || 0) - (b[1].touchedAt || 0));
    while (entries.length >= CACHE_LIMIT) {
        const [oldKey] = entries.shift();
        delete next[oldKey];
    }
    next[key] = { savedAt: now, touchedAt: now, data };
    return next;
}

const useSearchStore = create((set, get) => ({
    keyword: '',
    results: [],
    cache: readCache(),
    loading: false,
    error: '',
    searchHistory: [],

    setKeyword: (keyword) => set({ keyword }),
    setResults: (results) => set({ results }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    search: (keyword) => {
        if (!keyword) return;
        set({ keyword, loading: true, error: '' });
    },

    searchSuccess: (data, keyword) => {
        const key = normalizeKeyword(keyword || get().keyword);
        const slim = normalizeShows(data);
        if (!key) {
            set({ results: slim, loading: false });
            return;
        }
        const cache = remember(get().cache, key, slim);
        set({
            keyword: keyword || get().keyword,
            results: slim,
            loading: false,
            error: '',
            cache,
        });
        writeCache(cache);
    },

    searchError: (error) => {
        set({ loading: false, error });
    },

    getCache: (keyword) => {
        const key = normalizeKeyword(keyword);
        if (!key) return null;
        const hit = get().cache[key];
        if (!hit) return null;
        const now = Date.now();
        if (!hit.savedAt || now - hit.savedAt > CACHE_TTL) {
            const next = { ...get().cache };
            delete next[key];
            set({ cache: next });
            writeCache(next);
            return null;
        }
        const next = {
            ...get().cache,
            [key]: { ...hit, touchedAt: now },
        };
        set({ cache: next });
        writeCache(next);
        return hit.data;
    },

    addToHistory: (keyword) => {
        const text = String(keyword || '').trim();
        if (!text) return;
        const newHistory = [text, ...get().searchHistory.filter((item) => item !== text)].slice(0, 8);
        set({ searchHistory: newHistory });
        try {
            localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        } catch {
            // 历史写失败时仍保留当前内存记录
        }
    },

    clearHistory: () => {
        set({ searchHistory: [] });
        try {
            localStorage.removeItem('searchHistory');
        } catch {
            // 内存历史已经清空
        }
    },

    initHistory: () => {
        try {
            const history = localStorage.getItem('searchHistory');
            if (!history) return;
            const parsed = JSON.parse(history);
            if (Array.isArray(parsed)) set({ searchHistory: parsed.filter((item) => typeof item === 'string') });
        } catch {
            try {
                localStorage.removeItem('searchHistory');
            } catch {
                // 历史损坏时忽略删除失败
            }
        }
    },

    reset: () => set({
        keyword: '',
        results: [],
        loading: false,
        error: '',
    }),
}));

export default useSearchStore;
