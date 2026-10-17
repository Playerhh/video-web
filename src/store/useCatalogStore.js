import { create } from 'zustand';
import { fetchShows } from '../api/movieApi';
import { isAbortError } from '../api/http';
import { MAX_CATALOG_PAGES } from '../constants/catalog';
import { normalizeShows } from '../utils/show';

let runId = 0;

const useCatalogStore = create((set, get) => ({
    pages: {},
    loading: false,
    error: '',
    failedPage: null,

    ensureUntil: async (isEnough, signal) => {
        const id = ++runId;
        if (typeof isEnough !== 'function') return;

        if (isEnough(get().pages)) {
            if (id === runId) set({ loading: false, error: '', failedPage: null });
            return;
        }

        set({ loading: true, error: '' });

        try {
            for (let page = 0; page < MAX_CATALOG_PAGES; page += 1) {
                if (signal?.aborted || id !== runId) return;
                if (isEnough(get().pages)) break;
                if (get().pages[page]) continue;

                let data;
                try {
                    data = await fetchShows(page, signal);
                } catch (error) {
                    if (signal?.aborted || id !== runId || isAbortError(error)) return;
                    if (id === runId) {
                        set({
                            error: '目录加载失败，请重试',
                            failedPage: page,
                        });
                    }
                    return;
                }

                if (signal?.aborted || id !== runId) return;
                const shows = normalizeShows(data);
                set((state) => ({
                    pages: state.pages[page] ? state.pages : { ...state.pages, [page]: shows },
                    error: '',
                    failedPage: null,
                }));
            }
        } finally {
            if (id === runId) set({ loading: false });
        }
    },
}));

export default useCatalogStore;
