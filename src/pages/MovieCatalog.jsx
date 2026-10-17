import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAbortableRequest from '../hooks/useAbortableRequest';
import MovieList from '../components/MovieList';
import PageStatus from '../components/PageStatus';
import CatalogPager from '../components/CatalogPager';
import { hasTmdbKey } from '../api/tmdb';
import useTmdbStore from '../store/useTmdbStore';
import { parsePage } from '../constants/catalog';
import './Catalog.css';

export default function MovieCatalog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedPage = parsePage(searchParams.get('page'));
    const movies = useTmdbStore((state) => state.pages[requestedPage]);
    const totalPages = useTmdbStore((state) => state.totalPages);
    const loading = useTmdbStore((state) => state.pageLoading);
    const error = useTmdbStore((state) => state.pageError);
    const { start, abort } = useAbortableRequest();
    const configured = hasTmdbKey();
    const safePage = Math.min(requestedPage, Math.max(totalPages, 1));

    const load = useCallback(() => {
        const signal = start();
        useTmdbStore.getState().loadPopular(requestedPage, signal);
    }, [requestedPage, start]);

    useEffect(() => {
        if (!configured) {
            abort();
            return undefined;
        }
        load();
    }, [configured, load, abort]);

    useEffect(() => {
        if (!movies || requestedPage === safePage) return;
        const next = new URLSearchParams(searchParams);
        if (safePage <= 1) next.delete('page');
        else next.set('page', String(safePage));
        setSearchParams(next, { replace: true });
    }, [movies, requestedPage, safePage, searchParams, setSearchParams]);

    const goToPage = (page) => {
        const next = new URLSearchParams(searchParams);
        if (page <= 1) next.delete('page');
        else next.set('page', String(page));
        setSearchParams(next);
    };

    return (
        <section className="catalog-page">
            <div className="catalog-head">
                <h1>电影</h1>
                <p>热门电影来自 TMDB。这里展示资料和预告片，不播放正片。</p>
            </div>
            {!configured && <PageStatus status="info" message="未配置电影数据密钥，电影资料暂不显示" />}
            {configured && (
                <PageStatus
                    status={!movies ? (error ? 'error' : 'loading') : (movies.length ? 'ready' : 'empty')}
                    message={error || (movies ? '这一页暂时没有电影' : '正在加载电影...')}
                    onRetry={error && !movies ? load : undefined}
                >
                    <MovieList movies={movies || []} />
                </PageStatus>
            )}
            {configured && movies && (
                <CatalogPager page={safePage} pageCount={totalPages} onChange={goToPage} />
            )}
        </section>
    );
}
