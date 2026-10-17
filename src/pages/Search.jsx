// filepath: src/pages/Search.jsx
// 使用 Zustand 全局状态管理
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchBox from '../components/SearchBox';
import MovieList from '../components/MovieList';
import PageStatus from '../components/PageStatus';
import { searchShows } from '../api/movieApi';
import useAbortableRequest from '../hooks/useAbortableRequest';
import useSearchStore from '../store/useSearchStore';
import useTmdbStore from '../store/useTmdbStore';
import { MISSING_KEY_MESSAGE } from '../api/tmdb';
import './Search.css';

export default function Search() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get('q') || '';

    // ========== 使用 Zustand 全局状态 ==========
    // 从 store 中获取状态和方法
    const results = useSearchStore((state) => state.results);
    const loading = useSearchStore((state) => state.loading);
    const error = useSearchStore((state) => state.error);
    const movieResults = useTmdbStore((state) => state.movieResults);
    const movieLoading = useTmdbStore((state) => state.movieLoading);
    const movieError = useTmdbStore((state) => state.movieError);
    const { start, run, abort } = useAbortableRequest();

    useEffect(() => {
        const { getCache, setResults, setLoading, setError, searchSuccess } = useSearchStore.getState();
        const keyword = q.trim();

        if (!keyword) {
            abort('shows');
            setResults([]);
            setLoading(false);
            setError('请输入关键词进行搜索');
            return;
        }

        const cachedData = getCache(keyword);
        if (cachedData) {
            abort('shows');
            setResults(cachedData);
            setLoading(false);
            setError(cachedData.length ? '' : '未找到匹配影视，请尝试其它关键词');
            return;
        }

        setLoading(true);
        setError('');

        run(async (signal) => {
            try {
                const data = await searchShows(keyword, signal);
                if (signal.aborted) return;
                searchSuccess(data, keyword);
                if (!useSearchStore.getState().results.length) {
                    setError('未找到匹配影视，请尝试其它关键词');
                }
                setLoading(false);
            } catch (requestError) {
                if (signal.aborted) return;
                setError('搜索失败，请稍后重试');
                setLoading(false);
                throw requestError;
            }
        }, 'shows').catch(() => {});
    }, [q, run, abort]);

    useEffect(() => {
        if (!q.trim()) {
            abort('movies');
            useTmdbStore.setState({ movieResults: [], movieLoading: false, movieError: '' });
            return;
        }
        const signal = start('movies');
        useTmdbStore.getState().searchMovieTitles(q, signal);
    }, [q, start, abort]);

    // ========== 搜索回调 ==========
    const handleSearch = (keyword) => {
        if (!keyword) return;
        navigate(`/search?q=${encodeURIComponent(keyword)}`);
    };

    return (
        <section className="search-page">
            <div className="page-title-row">
                <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
                <div>
                    <h2>搜索结果: {q || '未输入关键词'}</h2>
                    <p>当前页面展示关键词搜索结果，支持放心浏览</p>
                </div>
            </div>
            <SearchBox value={q} onSearch={handleSearch} />
            {/* 使用全局状态 */}
            <h3 className="search-section-title">剧集</h3>
            <PageStatus
                status={loading ? 'loading' : (error ? 'error' : (results.length ? 'ready' : 'empty'))}
                message={loading ? '正在搜索剧集...' : (error || '未找到匹配剧集')}
            >
                <MovieList movies={results} />
            </PageStatus>
            {q.trim() && (
                <>
                    <h3 className="search-section-title">电影</h3>
                    <PageStatus
                        status={movieLoading ? 'loading' : (movieError ? (movieError === MISSING_KEY_MESSAGE ? 'info' : 'error') : (movieResults.length ? 'ready' : 'empty'))}
                        message={movieLoading ? '正在搜索电影...' : (movieError || '未找到匹配电影')}
                    >
                        <MovieList movies={movieResults} />
                    </PageStatus>
                </>
            )}
        </section>
    );
}
