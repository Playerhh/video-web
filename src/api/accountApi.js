async function request(path, options = {}) {
    let response;
    try {
        response = await fetch(path, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.body ? {} : {}),
            },
            ...options,
        });
    } catch {
        const error = new Error('账号服务暂时不可用');
        error.code = 'ACCOUNT_OFFLINE';
        throw error;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || '请求失败');
        error.status = response.status;
        if (response.status === 401) error.code = 'ACCOUNT_GUEST';
        throw error;
    }
    return data;
}

export const registerAccount = (username, password) => request('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
});

export const loginAccount = (username, password) => request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
});

export const logoutAccount = () => request('/api/logout', { method: 'POST' });

export const fetchMe = () => request('/api/me');

export const fetchFavorites = () => request('/api/favorites');

export const saveFavorite = (snapshot) => request('/api/favorites', {
    method: 'PUT',
    body: JSON.stringify(snapshot),
});

export const removeFavorite = (source, id) => request(`/api/favorites?source=${encodeURIComponent(source)}&id=${id}`, {
    method: 'DELETE',
});

export const fetchProgress = () => request('/api/progress');

export const saveProgress = (record) => request('/api/progress', {
    method: 'PUT',
    body: JSON.stringify(record),
});
