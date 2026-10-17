import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import MovieList from '../components/MovieList';
import PageStatus from '../components/PageStatus';
import CatalogPager from '../components/CatalogPager';
import useAbortableRequest from '../hooks/useAbortableRequest';
import useCatalogStore from '../store/useCatalogStore';
import {
    MAX_CATALOG_PAGES,
    PAGE_SIZE,
    getCategory,
    getGenre,
    parsePage,
    safeDecode,
} from '../constants/catalog';
import { flattenPages } from '../utils/show';
import './Catalog.css';

export default function Catalog() {
    const { kind, genre } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const genreKey = genre ? safeDecode(genre) : '';
    const category = kind ? getCategory(kind) : null;
    const genreInfo = genreKey ? getGenre(genreKey) : null;
    const invalid = Boolean((kind && !category) || (genre && !genreInfo));

    const pages = useCatalogStore((state) => state.pages);
    const loading = useCatalogStore((state) => state.loading);
    const error = useCatalogStore((state) => state.error);
    const { start, abort } = useAbortableRequest();

    const load = useCallback(() => {
        const currentCategory = kind ? getCategory(kind) : null;
        const currentGenre = genre ? getGenre(safeDecode(genre)) : null;
        if (!currentCategory && !currentGenre) return;

        const signal = start();
        useCatalogStore.getState().ensureUntil((loadedPages) => {
            const all = flattenPages(loadedPages);
            if (currentCategory) {
                return all.filter((item) => item.type === currentCategory.type).length >= PAGE_SIZE;
            }
            return all.filter((item) => item.genres.includes(currentGenre.key)).length >= PAGE_SIZE;
        }, signal);
    }, [kind, genre, start]);

    useEffect(() => {
        if (invalid) {
            abort();
            return undefined;
        }
        load();
    }, [invalid, load, abort]);

    const filtered = useMemo(() => {
        const all = flattenPages(pages);
        if (category) return all.filter((item) => item.type === category.type);
        if (genreInfo) return all.filter((item) => item.genres.includes(genreInfo.key));
        return [];
    }, [pages, category, genreInfo]);

    const requestedPage = parsePage(searchParams.get('page'));
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
    const safePage = Math.min(requestedPage, pageCount);

    const catalogReady = Object.keys(pages).length > 0 || Boolean(error);

    useEffect(() => {
        if (invalid || loading || !catalogReady || requestedPage === safePage) return;
        const next = new URLSearchParams(searchParams);
        if (safePage <= 1) next.delete('page');
        else next.set('page', String(safePage));
        setSearchParams(next, { replace: true });
    }, [invalid, loading, catalogReady, requestedPage, safePage, searchParams, setSearchParams]);

    if (invalid) return <Navigate to="/" replace />;

    const title = category?.label || genreInfo.label;
    const description = category?.description || `按「${title}」题材筛选，匹配的是类型而不是剧名`;
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const showInitialLoading = loading && filtered.length === 0 && !error;
    const capped = Object.keys(pages).length >= MAX_CATALOG_PAGES && !loading && !error;
    const emptyText = category ? '这一类暂时没有数据' : '这个题材暂时没有数据';
    const listStatus = showInitialLoading
        ? 'loading'
        : (error && filtered.length === 0 ? 'error' : (filtered.length === 0 ? 'empty' : 'ready'));

    const goToPage = (page) => {
        const next = new URLSearchParams(searchParams);
        if (page <= 1) next.delete('page');
        else next.set('page', String(page));
        setSearchParams(next);
    };

    return (
        <section className="catalog-page">
            <div className="catalog-head">
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            {error && filtered.length > 0 && (
                <PageStatus status="error" message={error} onRetry={load} />
            )}
            <PageStatus
                status={listStatus}
                message={showInitialLoading ? `正在加载${title}...` : (error || emptyText)}
                onRetry={listStatus === 'error' ? load : undefined}
            >
                <MovieList movies={visible} />
            </PageStatus>
            {loading && filtered.length > 0 && <p className="catalog-hint">正在继续加载...</p>}
            {capped && filtered.length > 0 && filtered.length < PAGE_SIZE && (
                <p className="catalog-hint">在已加载的目录里，这一类不多。</p>
            )}
            <CatalogPager page={safePage} pageCount={filtered.length > PAGE_SIZE ? pageCount : 1} onChange={goToPage} />
        </section>
    );
}
