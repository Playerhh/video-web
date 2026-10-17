import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import express from 'express';
import { promisify } from 'util';
import { updateData } from './store.js';

const scrypt = promisify(scryptCallback);
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const FAVORITE_LIMIT = 200;
const PROGRESS_LIMIT = 500;

const app = express();
app.use(express.json({ limit: '32kb' }));

function readCookie(req) {
    const header = req.headers.cookie || '';
    const pair = header.split(';').map((item) => item.trim()).find((item) => item.startsWith('sid='));
    if (!pair) return '';
    try {
        return decodeURIComponent(pair.slice(4));
    } catch {
        return '';
    }
}

function setSessionCookie(res, token) {
    res.setHeader('Set-Cookie', `sid=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function sendError(res, status, message) {
    res.status(status).json({ message });
}

function validUsername(username) {
    return typeof username === 'string' && /^[\w\u4e00-\u9fa5]{3,20}$/.test(username);
}

function validPassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 72;
}

async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 32)).toString('hex');
    return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
    const [salt, hash] = String(stored || '').split(':');
    if (!salt || !hash) return false;
    const actual = await scrypt(password, salt, 32);
    const expected = Buffer.from(hash, 'hex');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
}

function clampTime(value) {
    const time = Number(value);
    const now = Date.now();
    if (!Number.isFinite(time) || time <= 0 || time > now + 60_000) return now;
    return time;
}

function sanitizeSnapshot(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const id = Number(body.id);
    const source = body.source === 'tmdb' || body.source === 'tvmaze' ? body.source : '';
    if (!source || !Number.isInteger(id) || id <= 0) return null;
    const image = body.image && typeof body.image === 'object' ? {
        medium: typeof body.image.medium === 'string' ? body.image.medium.slice(0, 500) : '',
        large: typeof body.image.large === 'string' ? body.image.large.slice(0, 500) : '',
    } : null;
    const snapshot = {
        id,
        source,
        name: String(body.name || '未命名').slice(0, 200),
        type: String(body.type || '').slice(0, 40),
        genres: Array.isArray(body.genres)
            ? body.genres.filter((genre) => typeof genre === 'string').slice(0, 12).map((genre) => genre.slice(0, 40))
            : [],
        language: String(body.language || '').slice(0, 40),
        premiered: String(body.premiered || '').slice(0, 40),
        rating: { average: Number.isFinite(Number(body.rating?.average)) ? Number(body.rating.average) : null },
        image: image && (image.medium || image.large) ? image : null,
        summary: String(body.summary || '').slice(0, 200),
        homepage: String(body.homepage || '').slice(0, 300),
        runtime: Number.isFinite(Number(body.runtime)) ? Number(body.runtime) : null,
        updatedAt: clampTime(body.updatedAt),
    };
    if (JSON.stringify(snapshot).length > 4000) return null;
    return snapshot;
}

function sanitizeProgress(body) {
    const showId = Number(body?.showId);
    const episodeId = Number(body?.episodeId);
    if (!Number.isInteger(showId) || showId <= 0 || !Number.isInteger(episodeId) || episodeId <= 0) return null;
    const season = Number.isInteger(body.season) && body.season >= 0 ? body.season : 0;
    const number = Number.isInteger(body.number) ? body.number : null;
    return {
        showId,
        episodeId,
        season,
        number,
        name: typeof body.name === 'string' ? body.name.slice(0, 200) : '',
        updatedAt: clampTime(body.updatedAt),
    };
}

function requireUser(req, res, next) {
    const token = readCookie(req);
    if (!token) return sendError(res, 401, '请先登录');
    updateData((data) => {
        const now = Date.now();
        data.sessions = data.sessions.filter((item) => item.expiresAt > now);
        const session = data.sessions.find((item) => item.id === token);
        req.userId = session?.userId || 0;
        return session || null;
    }).then((session) => {
        if (!session) return sendError(res, 401, '请先登录');
        next();
    }).catch(() => sendError(res, 500, '账号服务暂时不可用'));
}

app.post('/api/register', async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = req.body?.password;
    if (!validUsername(username)) return sendError(res, 400, '用户名需要 3 到 20 个字符');
    if (!validPassword(password)) return sendError(res, 400, '密码至少 8 位');
    const passwordHash = await hashPassword(password);
    const token = randomBytes(24).toString('hex');
    try {
        const user = await updateData((data) => {
            if (data.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
                const error = new Error('用户名已存在');
                error.status = 409;
                throw error;
            }
            const nextUser = {
                id: (data.users.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1,
                username,
                passwordHash,
                createdAt: Date.now(),
            };
            data.users.push(nextUser);
            data.sessions.push({ id: token, userId: nextUser.id, expiresAt: Date.now() + SESSION_MS });
            return { id: nextUser.id, username: nextUser.username };
        });
        setSessionCookie(res, token);
        res.status(201).json({ user });
    } catch (error) {
        sendError(res, error.status || 500, error.status ? error.message : '账号服务暂时不可用');
    }
});

app.post('/api/login', async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = req.body?.password || '';
    const data = await updateData((current) => current);
    const user = data.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return sendError(res, 401, '用户名或密码不正确');
    }
    const token = randomBytes(24).toString('hex');
    await updateData((current) => {
        current.sessions.push({ id: token, userId: user.id, expiresAt: Date.now() + SESSION_MS });
    });
    setSessionCookie(res, token);
    res.json({ user: { id: user.id, username: user.username } });
});

app.post('/api/logout', (req, res) => {
    const token = readCookie(req);
    updateData((data) => {
        data.sessions = data.sessions.filter((item) => item.id !== token);
    }).finally(() => {
        clearSessionCookie(res);
        res.json({ ok: true });
    });
});

app.get('/api/me', requireUser, (req, res) => {
    updateData((data) => data.users.find((item) => item.id === req.userId) || null)
        .then((user) => {
            if (!user) return sendError(res, 401, '请先登录');
            res.json({ user: { id: user.id, username: user.username } });
        })
        .catch(() => sendError(res, 500, '账号服务暂时不可用'));
});

app.get('/api/favorites', requireUser, (req, res) => {
    updateData((data) => data.favorites.filter((item) => item.userId === req.userId).map((item) => item.snapshot))
        .then((favorites) => res.json({ favorites }))
        .catch(() => sendError(res, 500, '账号服务暂时不可用'));
});

app.put('/api/favorites', requireUser, (req, res) => {
    const snapshot = sanitizeSnapshot(req.body);
    if (!snapshot) return sendError(res, 400, '收藏内容无法保存');
    updateData((data) => {
        const mine = data.favorites.filter((item) => item.userId === req.userId);
        const index = data.favorites.findIndex((item) => (
            item.userId === req.userId && item.snapshot.source === snapshot.source && item.snapshot.id === snapshot.id
        ));
        if (index < 0 && mine.length >= FAVORITE_LIMIT) {
            const error = new Error('收藏数量已达上限');
            error.status = 400;
            throw error;
        }
        const record = { userId: req.userId, snapshot };
        if (index >= 0) data.favorites[index] = record;
        else data.favorites.push(record);
        return snapshot;
    }).then((saved) => res.json({ favorite: saved })).catch((error) => {
        sendError(res, error.status || 500, error.status ? error.message : '账号服务暂时不可用');
    });
});

app.delete('/api/favorites', requireUser, (req, res) => {
    const source = req.query.source;
    const id = Number(req.query.id);
    if ((source !== 'tmdb' && source !== 'tvmaze') || !Number.isInteger(id) || id <= 0) {
        return sendError(res, 400, '收藏内容无法保存');
    }
    updateData((data) => {
        data.favorites = data.favorites.filter((item) => !(
            item.userId === req.userId && item.snapshot.source === source && item.snapshot.id === id
        ));
    }).then(() => res.json({ ok: true })).catch(() => sendError(res, 500, '账号服务暂时不可用'));
});

app.get('/api/progress', requireUser, (req, res) => {
    updateData((data) => data.progress.filter((item) => item.userId === req.userId).map(({ userId, ...item }) => item))
        .then((progress) => res.json({ progress }))
        .catch(() => sendError(res, 500, '账号服务暂时不可用'));
});

app.put('/api/progress', requireUser, (req, res) => {
    const record = sanitizeProgress(req.body);
    if (!record) return sendError(res, 400, '观看进度无法保存');
    updateData((data) => {
        const index = data.progress.findIndex((item) => item.userId === req.userId && item.showId === record.showId);
        const mine = data.progress.filter((item) => item.userId === req.userId);
        if (index < 0 && mine.length >= PROGRESS_LIMIT) {
            const error = new Error('观看进度数量已达上限');
            error.status = 400;
            throw error;
        }
        const next = { userId: req.userId, ...record };
        if (index >= 0) data.progress[index] = next;
        else data.progress.push(next);
        return record;
    }).then((saved) => res.json({ progress: saved })).catch((error) => {
        sendError(res, error.status || 500, error.status ? error.message : '账号服务暂时不可用');
    });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, '127.0.0.1', () => {
    console.log(`account server http://127.0.0.1:${port}`);
});
