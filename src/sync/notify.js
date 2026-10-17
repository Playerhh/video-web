let notify = () => {};

export function bindNotice(fn) {
    notify = typeof fn === 'function' ? fn : () => {};
    return () => {
        if (notify === fn) notify = () => {};
    };
}

export function notifyOnce(text) {
    if (text) notify(text);
}
