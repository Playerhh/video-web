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

const STORAGE_KEY = 'collectMovies';
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
                const saved = readJson(STORAGE_KEY);
                if (Array.isArray(saved)) {
                    set({
                        collects: saved.map((item) => normalizeShow({ ...item, source: item?.source === 'tmdb' ? 'tmdb' : 'tvmaze' })).filter(Boolean),
                    });
                    return;
                }

                const legacy = readJson(LEGACY_KEY);
                if (!Array.isArray(legacy) || legacy.length === 0) return;

                const ids = [...new Set(legacy.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
                const snapshots = await migrateLegacy(ids);
                set({ collects: snapshots });
                const savedOk = writeJson(STORAGE_KEY, snapshots);
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

    replaceCollects: (collects) => {
        set({ collects, storageWarning: '' });
        if (!writeJson(STORAGE_KEY, collects)) {
            set({ storageWarning: '收藏已更新，但浏览器空间不足，刷新后可能丢失' });
        }
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
        if (!writeJson(STORAGE_KEY, next)) {
            set({ storageWarning: '收藏已更新，但浏览器空间不足，刷新后可能丢失' });
            return;
        }
        if (!getSyncUser()) return;
        const task = removed
            ? removeFavorite(snapshot.source, snapshot.id)
            : saveFavorite(nextSnapshot);
        task.catch(() => notifyOnce('收藏已保存在这台浏览器，账号同步暂时失败'));
    },

    isCollected: (item) => get().collects.some((saved) => sameItem(saved, item)),

    clearCollects: () => {
        set({ collects: [], storageWarning: '' });
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // 内存中的收藏已经清空
        }
    },
}));

export default useMovieStore;
