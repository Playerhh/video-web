import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HeartFilled from '@ant-design/icons/es/icons/HeartFilled';
import HeartOutlined from '@ant-design/icons/es/icons/HeartOutlined';
import PageStatus from '../components/PageStatus';
import CastList from '../components/CastList';
import useAbortableRequest from '../hooks/useAbortableRequest';
import useMovieStore from '../store/useMovieStore';
import useTmdbStore from '../store/useTmdbStore';
import { FALLBACK_POSTER, posterOf, sameItem } from '../utils/show';
import './Detail.css';
import './MovieDetail.css';

export default function MovieDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const movieId = Number(id);
    const detail = useTmdbStore((state) => state.details[movieId]);
    const trailer = useTmdbStore((state) => state.trailers[movieId]);
    const collects = useMovieStore((state) => state.collects);
    const toggleCollect = useMovieStore((state) => state.toggleCollect);
    const movie = detail?.movie;
    const collected = collects.some((item) => sameItem(item, { id: movieId, source: 'tmdb' }));
    const { start, abort } = useAbortableRequest();

    const loadDetail = useCallback(() => {
        const signal = start('detail');
        useTmdbStore.getState().loadMovie(movieId, signal);
    }, [movieId, start]);

    const loadTrailer = useCallback(() => {
        const signal = start('trailer');
        useTmdbStore.getState().loadTrailer(movieId, signal);
    }, [movieId, start]);

    useEffect(() => {
        if (!Number.isInteger(movieId) || movieId <= 0) {
            abort('detail');
            return undefined;
        }
        loadDetail();
    }, [loadDetail, movieId, abort]);

    useEffect(() => {
        if (!movie) {
            abort('trailer');
            return undefined;
        }
        loadTrailer();
    }, [loadTrailer, movie, abort]);

    if (!Number.isInteger(movieId) || movieId <= 0) {
        return <PageStatus status="error" message="电影 ID 缺失" />;
    }
    if (!movie && (!detail || detail.loading)) return <PageStatus status="loading" message="正在加载电影详情..." />;
    if (detail?.error && !movie) {
        const missingKey = detail.error === '未配置电影数据密钥';
        return (
            <PageStatus
                status={missingKey ? 'info' : 'error'}
                message={missingKey ? '未配置电影数据密钥，电影资料暂不显示' : detail.error}
                onRetry={missingKey ? undefined : loadDetail}
            />
        );
    }

    return (
        <section className="detail-page">
            <button type="button" className="back-btn" onClick={() => navigate(-1)}>← 返回上一页</button>
            {movie ? (
                <>
                    <div className="detail-card">
                        <img
                            className="detail-image"
                            src={posterOf(movie, 'large') || FALLBACK_POSTER}
                            alt={movie.name}
                            width="320"
                            height="480"
                            fetchPriority="high"
                        />
                        <div className="detail-content">
                            <div className="detail-title-row">
                                <h2>{movie.name}</h2>
                                <button
                                    type="button"
                                    className={collected ? 'detail-fav collected' : 'detail-fav'}
                                    onClick={() => toggleCollect(movie)}
                                >
                                    {collected ? <HeartFilled /> : <HeartOutlined />}
                                    {collected ? '已收藏' : '收藏'}
                                </button>
                            </div>
                            <p className="tags">{movie.genres.join(' / ') || '类型未知'} · {movie.language || '语言未知'}</p>
                            <p>评分：{movie.rating?.average ?? '暂无'} · 上映：{movie.premiered || '未知'} · 时长：{movie.runtime || '--'} 分钟</p>
                            <p className="summary">{movie.summary || '暂无简介'}</p>
                            <div className="detail-meta">
                                <div><strong>官网：</strong>{movie.homepage ? <a href={movie.homepage} target="_blank" rel="noreferrer">访问</a> : '无'}</div>
                            </div>
                        </div>
                    </div>
                    <CastList
                        cast={Array.isArray(detail?.cast) ? detail.cast : undefined}
                        loading={detail?.loading && !Array.isArray(detail?.cast)}
                        error={detail?.castError || ''}
                    />
                    <section className="trailer-panel">
                        <h3>预告片</h3>
                        {trailer?.loading && <PageStatus status="loading" message="正在加载预告片..." />}
                        {trailer?.error && <PageStatus status="error" message={trailer.error} onRetry={loadTrailer} />}
                        {trailer?.loaded && trailer.key && (
                            <iframe
                                className="trailer-frame"
                                title={`${movie.name} 预告片`}
                                src={`https://www.youtube-nocookie.com/embed/${trailer.key}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                        {trailer?.loaded && !trailer.key && !trailer.error && (
                            <PageStatus status="empty" message="暂无预告片" />
                        )}
                    </section>
                </>
            ) : (
                <PageStatus status="empty" message="没有找到电影详情" />
            )}
        </section>
    );
}
