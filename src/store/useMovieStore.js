/**
 * 影视数据全局状态管理 - 使用 Zustand
 * 收藏保存瘦快照，刷新后仍能展示海报和标题
 */
import { create } from 'zustand';
import { removeFavorite, saveFavorite } from '../api/accountApi';
import { getShowDetail } from '../api/movieApi';
import { notifyOnce } from '../sync/notify';
import { getSyncUser } from '../sync/session';
import { normalizeShow, sameItem } from '../utils/show';

const MIXED_KEY = 'collectMovies';
const GUEST_KEY = 'collectMoviesGuest';
const LEGACY_KEY = 'collectMovieIds';

function readJson(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

let initPromise = null;

function normalizeSaved(list) {
    if (!Array.isArray(list)) return [];
    return list
        .map((item) => normalizeShow({
            ...item,
            source: item?.source === 'tmdb' ? 'tmdb' : 'tvmaze',
        }))
        .filter(Boolean);
}

function readCollects(key) {
    return normalizeSaved(readJson(key));
}

function dropMixedKey() {
    try {
        localStorage.removeItem(MIXED_KEY);
    } catch {
        // 旧的混合收藏删不掉时，后面也不再读取它
    }
}

async function migrateLegacy(ids) {
    const snapshots = [];
    for (let index = 0; index < ids.length; index += 3) {
        const batch = ids.slice(index, index + 3);
        const results = await Promise.all(
            batch.map((id) => getShowDetail(id).then((show) => normalizeShow(show)).catch(() => null))
        );
        snapshots.push(...results.filter(Boolean));
    }
    return snapshots;
}

const useMovieStore = create((set, get) => ({
    movies: [],
    loading: false,
    error: '',
    collects: [],
    storageWarning: '',

    setMovies: (movies) => set({ movies }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    initCollects: () => {
        if (!initPromise) {
            initPromise = (async () => {
                dropMixedKey();
                const saved = readJson(GUEST_KEY);
                if (Array.isArray(saved)) {
                    if (!getSyncUser()) set({ collects: normalizeSaved(saved) });
                    return;
                }

                const legacy = readJson(LEGACY_KEY);
                if (!Array.isArray(legacy) || legacy.length === 0) {
                    if (!getSyncUser()) set({ collects: [] });
                    return;
                }

                const ids = [...new Set(legacy.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
                const snapshots = await migrateLegacy(ids);
                if (!getSyncUser()) set({ collects: snapshots });
                const savedOk = writeJson(GUEST_KEY, snapshots);
                if (savedOk) {
                    try {
                        localStorage.removeItem(LEGACY_KEY);
                    } catch {
                        // 旧键删不掉不影响新收藏
                    }
                    return;
                }
                set({ storageWarning: '收藏已读出，但浏览器空间不足，刷新后可能丢失' });
            })();
        }
        return initPromise;
    },

    showGuestCollects: () => {
        dropMixedKey();
        set({ collects: readCollects(GUEST_KEY), storageWarning: '' });
    },

    replaceCollects: (collects) => {
        set({ collects, storageWarning: '' });
    },

    toggleCollect: (show) => {
        const snapshot = normalizeShow(show);
        if (!snapshot) return;
        const removed = get().collects.some((item) => sameItem(item, snapshot));
        const nextSnapshot = { ...snapshot, updatedAt: Date.now() };
        const next = removed
            ? get().collects.filter((item) => !sameItem(item, snapshot))
            : [nextSnapshot, ...get().collects];
        set({ collects: next, storageWarning: '' });
        if (!getSyncUser()) {
            if (!writeJson(GUEST_KEY, next)) {
                set({ storageWarning: '收藏已更新，但浏览器空间不足，刷新后可能丢失' });
            }
            return;
        }
        const task = removed
            ? removeFavorite(snapshot.source, snapshot.id)
            : saveFavorite(nextSnapshot);
        task.catch(() => notifyOnce('收藏没有同步到账号，刷新后会按账号里的记录显示'));
    },

    isCollected: (item) => get().collects.some((saved) => sameItem(saved, item)),

    clearCollects: () => {
        set({ collects: [], storageWarning: '' });
        try {
            localStorage.removeItem(GUEST_KEY);
            localStorage.removeItem(MIXED_KEY);
        } catch {
            // 内存中的收藏已经清空
        }
    },
}));

export default useMovieStore;
