import { create } from 'zustand';
import { saveProgress } from '../api/accountApi';
import { isAbortError } from '../api/http';
import { getShowCast, getShowEpisodes } from '../api/movieApi';
import { getSyncUser } from '../sync/session';
import { normalizeCast, normalizeEpisodes } from '../utils/show';

const CACHE_LIMIT = 8;
const PROGRESS_KEY = 'watchProgress';

const inflightEpisodes = new Map();
const inflightCast = new Map();
const episodeRuns = new Map();
const castRuns = new Map();

function readProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const progress = {};
        Object.entries(parsed).forEach(([key, value]) => {
            const showId = Number(key);
            const episodeId = Number(value?.episodeId);
            if (!Number.isInteger(showId) || showId <= 0 || !Number.isInteger(episodeId)) return;
            progress[showId] = {
                episodeId,
                season: Number.isInteger(value.season) ? value.season : 0,
                number: Number.isInteger(value.number) ? value.number : null,
                name: typeof value.name === 'string' ? value.name : '',
                ...(Number.isFinite(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
            };
        });
        return progress;
    } catch {
        try {
            localStorage.removeItem(PROGRESS_KEY);
        } catch {
            // 损坏的进度删不掉时，当空记录使用
        }
        return {};
    }
}

function writeProgress(progress) {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        return true;
    } catch {
        return false;
    }
}

function touchEntry(entries, showId, patch) {
    const next = {
        ...entries,
        [showId]: {
            ...(entries[showId] || {}),
            ...patch,
            touchedAt: Date.now(),
        },
    };
    const ids = Object.keys(next);
    if (ids.length <= CACHE_LIMIT) return next;
    ids.sort((left, right) => (next[left].touchedAt || 0) - (next[right].touchedAt || 0))
        .slice(0, ids.length - CACHE_LIMIT)
        .forEach((id) => {
            if (Number(id) !== Number(showId)) delete next[id];
        });
    return next;
}

function showIdOf(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : 0;
}

const useDetailStore = create((set, get) => ({
    entries: {},
    progress: readProgress(),
    progressWarning: '',

    loadEpisodes: (showId, signal) => {
        const id = showIdOf(showId);
        if (!id) return Promise.resolve();
        if (get().entries[id]?.episodes) {
            set((state) => ({ entries: touchEntry(state.entries, id, {}) }));
            return Promise.resolve();
        }
        const pending = inflightEpisodes.get(id);
        if (pending && !pending.signal.aborted) return pending.promise;

        const run = (episodeRuns.get(id) || 0) + 1;
        episodeRuns.set(id, run);
        set((state) => ({
            entries: touchEntry(state.entries, id, { episodesLoading: true, episodesError: '' }),
        }));

        const promise = getShowEpisodes(id, signal)
            .then((data) => {
                if (signal?.aborted || episodeRuns.get(id) !== run) return;
                set((state) => ({
                    entries: touchEntry(state.entries, id, {
                        episodes: normalizeEpisodes(data),
                        episodesLoading: false,
                        episodesError: '',
                    }),
                }));
            })
            .catch((error) => {
                if (signal?.aborted || episodeRuns.get(id) !== run || isAbortError(error)) return;
                set((state) => ({
                    entries: touchEntry(state.entries, id, {
                        episodesLoading: false,
                        episodesError: '分集加载失败，请重试',
                    }),
                }));
            })
            .finally(() => {
                if (inflightEpisodes.get(id)?.promise === promise) inflightEpisodes.delete(id);
            });

        inflightEpisodes.set(id, { promise, signal });
        return promise;
    },

    loadCast: (showId, signal) => {
        const id = showIdOf(showId);
        if (!id) return Promise.resolve();
        if (get().entries[id]?.cast) {
            set((state) => ({ entries: touchEntry(state.entries, id, {}) }));
            return Promise.resolve();
        }
        const pending = inflightCast.get(id);
        if (pending && !pending.signal.aborted) return pending.promise;

        const run = (castRuns.get(id) || 0) + 1;
        castRuns.set(id, run);
        set((state) => ({
            entries: touchEntry(state.entries, id, { castLoading: true, castError: '' }),
        }));

        const promise = getShowCast(id, signal)
            .then((data) => {
                if (signal?.aborted || castRuns.get(id) !== run) return;
                set((state) => ({
                    entries: touchEntry(state.entries, id, {
                        cast: normalizeCast(data),
                        castLoading: false,
                        castError: '',
                    }),
                }));
            })
            .catch((error) => {
                if (signal?.aborted || castRuns.get(id) !== run || isAbortError(error)) return;
                set((state) => ({
                    entries: touchEntry(state.entries, id, {
                        castLoading: false,
                        castError: '演员加载失败，请重试',
                    }),
                }));
            })
            .finally(() => {
                if (inflightCast.get(id)?.promise === promise) inflightCast.delete(id);
            });

        inflightCast.set(id, { promise, signal });
        return promise;
    },

    replaceProgress: (progress) => {
        set({ progress, progressWarning: '' });
        if (!writeProgress(progress)) {
            set({ progressWarning: '进度已更新，但浏览器空间不足，刷新后可能丢失' });
        }
    },

    markProgress: (showId, episode) => {
        const id = showIdOf(showId);
        if (!id || !episode?.id) return;
        const record = {
            showId: id,
            episodeId: Number(episode.id),
            season: episode.season > 0 ? episode.season : 0,
            number: Number.isInteger(episode.number) ? episode.number : null,
            name: episode.name || '',
            updatedAt: Date.now(),
        };
        const progress = { ...get().progress, [id]: record };
        set({ progress, progressWarning: '' });
        if (!writeProgress(progress)) {
            set({ progressWarning: '进度已更新，但浏览器空间不足，刷新后可能丢失' });
            return;
        }
        if (!getSyncUser()) return;
        saveProgress(record).catch(() => {
            set({ progressWarning: '进度已保存在这台浏览器，账号同步暂时失败' });
        });
    },
}));

export default useDetailStore;
