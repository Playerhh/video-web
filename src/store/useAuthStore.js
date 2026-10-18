import { create } from 'zustand';
import {
    fetchFavorites,
    fetchMe,
    fetchProgress,
    loginAccount,
    logoutAccount,
    registerAccount,
    saveFavorite,
    saveProgress,
} from '../api/accountApi';
import { notifyOnce } from '../sync/notify';
import { setSyncUser } from '../sync/session';
import { favoritesToUpload, mergeFavorites, mergeProgress, progressToUpload } from '../utils/accountSync';
import useDetailStore from './useDetailStore';
import useMovieStore from './useMovieStore';

let initPromise = null;

const useAuthStore = create((set, get) => ({
    user: null,
    ready: false,
    loginPrompt: false,

    init: () => {
        if (!initPromise) {
            initPromise = (async () => {
                try {
                    const data = await fetchMe();
                    setSyncUser(data.user);
                    set({ user: data.user, ready: true, loginPrompt: false });
                    await get().syncAccount();
                } catch (error) {
                    setSyncUser(null);
                    set({
                        user: null,
                        ready: true,
                        loginPrompt: error?.code === 'ACCOUNT_GUEST',
                    });
                }
            })();
        }
        return initPromise;
    },

    syncAccount: async () => {
        await useMovieStore.getState().initCollects();
        try {
            const [favoriteData, progressData] = await Promise.all([fetchFavorites(), fetchProgress()]);
            const remoteFavorites = favoriteData.favorites || [];
            const remoteProgress = progressData.progress || [];
            const mergedFavorites = mergeFavorites(useMovieStore.getState().collects, remoteFavorites);
            const mergedProgress = mergeProgress(useDetailStore.getState().progress, remoteProgress);
            useMovieStore.getState().replaceCollects(mergedFavorites);
            useDetailStore.getState().replaceProgress(mergedProgress);
            await Promise.all([
                ...favoritesToUpload(mergedFavorites, remoteFavorites).map((item) => saveFavorite(item)),
                ...progressToUpload(mergedProgress, remoteProgress).map((item) => saveProgress(item)),
            ]);
            set({ loginPrompt: false });
        } catch {
            notifyOnce('账号同步暂时失败，本机记录仍然保留');
        }
    },

    submit: async (mode, username, password) => {
        const data = mode === 'register'
            ? await registerAccount(username, password)
            : await loginAccount(username, password);
        setSyncUser(data.user);
        set({ user: data.user, ready: true, loginPrompt: false });
        await get().syncAccount();
    },

    logout: async () => {
        try {
            await logoutAccount();
        } catch {
            // 服务器没开时仍退出本页登录态，收藏改回未登录时的记录
        }
        setSyncUser(null);
        useMovieStore.getState().showGuestCollects();
        set({ user: null, loginPrompt: true });
    },

    dismissLoginPrompt: () => set({ loginPrompt: false }),
}));

export default useAuthStore;
