import { useCallback, useEffect, useRef } from 'react';
import { isAbortError } from '../api/http';

export default function useAbortableRequest() {
    const controllers = useRef(new Map());

    const abort = useCallback((key) => {
        if (key == null) {
            controllers.current.forEach((controller) => controller.abort());
            controllers.current.clear();
            return;
        }
        controllers.current.get(key)?.abort();
        controllers.current.delete(key);
    }, []);

    const start = useCallback((key = 'default') => {
        abort(key);
        const controller = new AbortController();
        controllers.current.set(key, controller);
        return controller.signal;
    }, [abort]);

    const run = useCallback(async (task, key = 'default') => {
        const signal = start(key);
        try {
            return await task(signal);
        } catch (error) {
            if (signal.aborted || isAbortError(error)) return undefined;
            throw error;
        }
    }, [start]);

    useEffect(() => () => abort(), [abort]);

    return { start, run, abort };
}
