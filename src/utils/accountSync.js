import { itemKey, normalizeShow } from './show';

function stamp(item) {
    return Number.isFinite(item?.updatedAt) && item.updatedAt > 0 ? item.updatedAt : 0;
}

export function mergeFavorites(local = [], remote = []) {
    const map = new Map();
    local.forEach((item) => {
        const snapshot = normalizeShow(item);
        if (!snapshot) return;
        map.set(itemKey(snapshot), { ...snapshot, updatedAt: stamp(item) });
    });
    remote.forEach((item) => {
        const snapshot = normalizeShow(item);
        if (!snapshot) return;
        const key = itemKey(snapshot);
        const prev = map.get(key);
        const updatedAt = stamp(item);
        if (!prev || updatedAt >= prev.updatedAt) map.set(key, { ...snapshot, updatedAt });
    });
    const now = Date.now();
    return [...map.values()].map((item) => (item.updatedAt ? item : { ...item, updatedAt: now }));
}

export function favoritesToUpload(merged = [], remote = []) {
    const remoteMap = new Map();
    remote.forEach((item) => {
        const snapshot = normalizeShow(item);
        if (snapshot) remoteMap.set(itemKey(snapshot), stamp(item));
    });
    return merged.filter((item) => {
        const previous = remoteMap.get(itemKey(item));
        return previous == null || item.updatedAt > previous;
    });
}

function progressRecord(showId, value) {
    const id = Number(showId);
    const episodeId = Number(value?.episodeId);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(episodeId) || episodeId <= 0) return null;
    return {
        showId: id,
        episodeId,
        season: Number.isInteger(value.season) && value.season > 0 ? value.season : 0,
        number: Number.isInteger(value.number) ? value.number : null,
        name: typeof value.name === 'string' ? value.name : '',
        updatedAt: stamp(value),
    };
}

export function mergeProgress(local = {}, remote = []) {
    const map = new Map();
    Object.entries(local).forEach(([showId, value]) => {
        const record = progressRecord(showId, value);
        if (record) map.set(record.showId, record);
    });
    remote.forEach((item) => {
        const record = progressRecord(item.showId, item);
        if (!record) return;
        const prev = map.get(record.showId);
        if (!prev || record.updatedAt >= prev.updatedAt) map.set(record.showId, record);
    });
    const now = Date.now();
    const progress = {};
    map.forEach((record) => {
        progress[record.showId] = record.updatedAt ? record : { ...record, updatedAt: now };
    });
    return progress;
}

export function progressToUpload(merged = {}, remote = []) {
    const remoteMap = new Map(remote.map((item) => [Number(item.showId), stamp(item)]));
    return Object.values(merged).filter((item) => {
        const previous = remoteMap.get(item.showId);
        return previous == null || item.updatedAt > previous;
    });
}
