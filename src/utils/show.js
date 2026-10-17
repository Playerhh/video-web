export const FALLBACK_POSTER = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="210" height="280"><rect fill="#e5e7eb" width="100%" height="100%"/><text x="50%" y="50%" fill="#6b7280" font-size="16" text-anchor="middle" dominant-baseline="middle">暂无海报</text></svg>'
)}`;

export function stripHtml(html = '') {
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const MOVIE_GENRES = {
    28: '动作',
    12: '冒险',
    16: '动画',
    35: '喜剧',
    80: '犯罪',
    99: '纪录',
    18: '剧情',
    10751: '家庭',
    14: '奇幻',
    36: '历史',
    27: '恐怖',
    10402: '音乐',
    9648: '悬疑',
    10749: '爱情',
    878: '科幻',
    10770: '电视电影',
    53: '惊悚',
    10752: '战争',
    37: '西部',
};

export function itemSource(item) {
    return item?.source === 'tmdb' ? 'tmdb' : 'tvmaze';
}

export function itemKey(item) {
    return `${itemSource(item)}:${Number(item?.id)}`;
}

export function sameItem(left, right) {
    return itemSource(left) === itemSource(right) && Number(left?.id) === Number(right?.id);
}

export function detailPath(item) {
    const id = Number(item?.id);
    return itemSource(item) === 'tmdb' ? `/movie/${id}` : `/detail/${id}`;
}

export function normalizeShow(show) {
    if (!show || show.id == null || Number.isNaN(Number(show.id))) return null;
    const source = itemSource(show);
    const genres = Array.isArray(show.genres)
        ? show.genres.map((genre) => (typeof genre === 'string' ? genre : genre?.name)).filter(Boolean)
        : [];
    return {
        id: Number(show.id),
        name: show.name || show.title || '未命名',
        source,
        type: show.type || (source === 'tmdb' ? 'Movie' : ''),
        genres,
        language: show.language || show.original_language || '',
        premiered: show.premiered || show.release_date || '',
        rating: { average: show.rating?.average ?? show.vote_average ?? null },
        image: show.image?.large || show.image?.medium
            ? { medium: show.image.medium || show.image.large, large: show.image.large || show.image.medium }
            : null,
        summary: stripHtml(show.summary || show.overview || '').slice(0, source === 'tmdb' ? 160 : 120),
        homepage: show.homepage || '',
        runtime: show.runtime ?? null,
        ...(Number.isFinite(show.updatedAt) ? { updatedAt: show.updatedAt } : {}),
    };
}

export function normalizeShows(list) {
    return (Array.isArray(list) ? list : []).map(normalizeShow).filter(Boolean);
}

export function flattenPages(pages = {}) {
    return Object.keys(pages)
        .map(Number)
        .filter((page) => Number.isInteger(page))
        .sort((a, b) => a - b)
        .flatMap((page) => pages[page] || []);
}

export function posterOf(show, size = 'medium') {
    return show?.image?.[size] || show?.image?.medium || show?.image?.original || FALLBACK_POSTER;
}

export function normalizeMovie(movie) {
    if (!movie || movie.id == null || Number.isNaN(Number(movie.id))) return null;
    const posterPath = movie.poster_path;
    const genres = Array.isArray(movie.genres)
        ? movie.genres.map((genre) => genre?.name).filter(Boolean)
        : (movie.genre_ids || []).map((id) => MOVIE_GENRES[id]).filter(Boolean);
    return normalizeShow({
        id: movie.id,
        name: movie.title || movie.name,
        source: 'tmdb',
        type: 'Movie',
        genres,
        language: movie.original_language,
        premiered: movie.release_date,
        vote_average: movie.vote_average,
        image: posterPath ? {
            medium: `https://image.tmdb.org/t/p/w342${posterPath}`,
            large: `https://image.tmdb.org/t/p/w780${posterPath}`,
        } : movie.image,
        summary: movie.overview,
        homepage: movie.homepage,
        runtime: movie.runtime,
    });
}

export function normalizeMovies(list) {
    return (Array.isArray(list) ? list : []).map(normalizeMovie).filter(Boolean);
}

export function pickTrailer(payload) {
    const list = Array.isArray(payload) ? payload : (payload?.results || []);
    const trailers = list.filter((item) => item?.site === 'YouTube' && item?.type === 'Trailer' && item?.key);
    if (!trailers.length) return '';
    const official = trailers.find((item) => /official/i.test(item.name || ''));
    return (official || trailers[0]).key;
}

export function normalizeEpisode(episode) {
    if (!episode || episode.id == null || Number.isNaN(Number(episode.id))) return null;
    const season = Number.isInteger(episode.season) && episode.season > 0 ? episode.season : 0;
    return {
        id: Number(episode.id),
        name: episode.name || '未命名',
        season,
        number: Number.isInteger(episode.number) ? episode.number : null,
        airdate: episode.airdate || '',
        runtime: episode.runtime ?? null,
        rating: { average: episode.rating?.average ?? null },
        image: episode.image?.medium ? { medium: episode.image.medium } : null,
        summary: stripHtml(episode.summary || '').slice(0, 160),
    };
}

export function normalizeEpisodes(list) {
    return (Array.isArray(list) ? list : []).map(normalizeEpisode).filter(Boolean);
}

export function normalizeCastMember(item) {
    const person = item?.person;
    if (!person || person.id == null || Number.isNaN(Number(person.id))) return null;
    return {
        id: Number(person.id),
        name: person.name || '未知演员',
        character: item.character?.name || '未知角色',
        image: person.image?.medium ? { medium: person.image.medium } : null,
    };
}

export function normalizeCast(list) {
    return (Array.isArray(list) ? list : []).map(normalizeCastMember).filter(Boolean);
}

export function normalizeTmdbCast(list) {
    return (Array.isArray(list) ? list : []).map((item) => {
        if (!item || item.id == null || Number.isNaN(Number(item.id))) return null;
        return {
            id: Number(item.id),
            name: item.name || '未知演员',
            character: item.character || '未知角色',
            image: item.profile_path ? { medium: `https://image.tmdb.org/t/p/w185${item.profile_path}` } : null,
        };
    }).filter(Boolean);
}

export function groupEpisodes(episodes = []) {
    const groups = new Map();
    episodes.forEach((episode) => {
        const season = episode.season > 0 ? episode.season : 0;
        if (!groups.has(season)) groups.set(season, []);
        groups.get(season).push(episode);
    });
    return [...groups.keys()]
        .sort((left, right) => {
            if (left === 0) return 1;
            if (right === 0) return -1;
            return left - right;
        })
        .map((season) => ({
            season,
            label: season === 0 ? '特别篇' : `第 ${season} 季`,
            episodes: groups.get(season).slice().sort((left, right) => (left.number ?? 9999) - (right.number ?? 9999)),
        }));
}
