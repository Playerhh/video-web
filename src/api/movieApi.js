import http from './http';

export const fetchShows = async (page = 0, signal) => {
    const response = await http.get('/shows', {
        params: { page },
        signal,
    });
    return response.data;
};

export const searchShows = async (keyword, signal) => {
    const response = await http.get('/search/shows', {
        params: { q: keyword },
        signal,
    });
    return (response.data || []).map((item) => item.show).filter(Boolean);
};

export const getShowDetail = async (id, signal) => {
    const response = await http.get(`/shows/${id}`, { signal });
    return response.data;
};

export const getShowEpisodes = async (id, signal) => {
    const response = await http.get(`/shows/${id}/episodes`, { signal });
    return response.data;
};

export const getShowCast = async (id, signal) => {
    const response = await http.get(`/shows/${id}/cast`, { signal });
    return response.data;
};
