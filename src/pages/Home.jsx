import { useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ShowRow from '../components/ShowRow';
import PageStatus from '../components/PageStatus';
import useAbortableRequest from '../hooks/useAbortableRequest';
import useCatalogStore from '../store/useCatalogStore';
import useTmdbStore from '../store/useTmdbStore';
import { hasTmdbKey } from '../api/tmdb';
import { CATEGORIES, ROW_SIZE } from '../constants/catalog';
import { loadCatalogPage } from '../routes/catalog';
import { flattenPages } from '../utils/show';
import './Home.css';

const categoryList = Object.entries(CATEGORIES);

function MovieRow({ hold }) {
    const movies = useTmdbStore((state) => state.pages[1]);
    const error = useTmdbStore((state) => state.pageError);
    const loading = useTmdbStore((state) => state.pageLoading);
    const { start, abort } = useAbortableRequest();
    const configured = hasTmdbKey();

    const load = useCallback(() => {
        const signal = start();
        useTmdbStore.getState().loadPopular(1, signal);
    }, [start]);

    useEffect(() => {
        if (!configured) {
            abort();
            return undefined;
        }
        load();
    }, [configured, load, abort]);

    if (hold) return null;

    return (
        <section>
            {configured ? (
                <ShowRow
                    title="电影"
                    to="/category/movie"
                    shows={(movies || []).slice(0, ROW_SIZE)}
                    status={!movies ? (error ? 'error' : 'loading') : (movies.length ? 'ready' : 'empty')}
                    message={error || (movies ? '暂时没有电影' : '正在加载电影...')}
                    onRetry={error ? load : undefined}
                />
            ) : (
                <section className="show-row">
                    <div className="show-row-head">
                        <h2>电影</h2>
                    </div>
                    <PageStatus status="info" message="未配置电影数据密钥，电影资料暂不显示" />
                </section>
            )}
        </section>
    );
}

function homeReady(pages) {
    const all = flattenPages(pages);
    return categoryList.every(([, category]) => (
        all.filter((item) => item.type === category.type).length >= ROW_SIZE
    ));
}

export default function Home() {
    const pages = useCatalogStore((state) => state.pages);
    const loading = useCatalogStore((state) => state.loading);
    const error = useCatalogStore((state) => state.error);
    const { start } = useAbortableRequest();

    const load = useCallback(() => {
        const signal = start();
        useCatalogStore.getState().ensureUntil(homeReady, signal);
    }, [start]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const prefetch = () => {
            loadCatalogPage();
        };
        if (typeof window.requestIdleCallback === 'function') {
            const idleId = window.requestIdleCallback(prefetch);
            return () => window.cancelIdleCallback(idleId);
        }
        const timerId = window.setTimeout(prefetch, 1);
        return () => window.clearTimeout(timerId);
    }, []);

    const rows = useMemo(() => {
        const all = flattenPages(pages);
        return categoryList.map(([kind, category]) => ({
            kind,
            label: category.label,
            shows: all.filter((item) => item.type === category.type).slice(0, ROW_SIZE),
        }));
    }, [pages]);

    const hasShows = rows.some((row) => row.shows.length > 0);
    const showRows = hasShows || (!loading && !error);
    const initialLoading = loading && !hasShows && !error;
    const catalogFailed = Boolean(error) && !hasShows;
    const hideMovieNotice = catalogFailed && !hasTmdbKey();

    return (
        <section className="home-page">
            <div className="home-head">
                <h1>影视资讯聚合平台</h1>
                <p>剧集、动画、纪录片来自 TVMaze，电影来自 TMDB。这里展示资料和预告片，不播放正片。</p>
            </div>
            <div className="home-entries">
                {categoryList.map(([kind, category]) => (
                    <Link key={kind} to={`/category/${kind}`} className="home-entry">
                        {category.label}
                    </Link>
                ))}
                <Link to="/category/movie" className="home-entry">电影</Link>
            </div>
            {initialLoading && <PageStatus status="loading" message="正在加载首页影视..." />}
            {error && <PageStatus status="error" message={error} onRetry={load} />}
            {showRows && rows.map((row) => (
                <ShowRow
                    key={row.kind}
                    title={row.label}
                    to={`/category/${row.kind}`}
                    shows={row.shows}
                    status={row.shows.length ? 'ready' : (loading ? 'loading' : 'empty')}
                    message={loading && !row.shows.length ? '正在整理这一类...' : '这一类暂时没有数据'}
                />
            ))}
            <MovieRow hold={initialLoading || hideMovieNotice} />
        </section>
    );
}
