export const PAGE_SIZE = 24;
export const ROW_SIZE = 10;
export const MAX_CATALOG_PAGES = 4;

export const CATEGORIES = {
    tv: { label: '剧集', type: 'Scripted', description: '按剧情长片和连续剧浏览' },
    anime: { label: '动画', type: 'Animation', description: '按动画类型浏览' },
    docs: { label: '纪录片', type: 'Documentary', description: '按纪录片类型浏览' },
};

export const GENRES = [
    { key: 'Drama', label: '剧情' },
    { key: 'Comedy', label: '喜剧' },
    { key: 'Action', label: '动作' },
    { key: 'Romance', label: '爱情' },
    { key: 'Thriller', label: '惊悚' },
    { key: 'Science-Fiction', label: '科幻' },
    { key: 'Crime', label: '犯罪' },
    { key: 'Fantasy', label: '奇幻' },
];

export function getCategory(kind) {
    return CATEGORIES[kind] || null;
}

export function getGenre(key) {
    return GENRES.find((item) => item.key === key) || null;
}

export function parsePage(value) {
    const page = Number(value);
    if (!Number.isInteger(page) || page < 1) return 1;
    return page;
}

export function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
