import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HeartFilled from '@ant-design/icons/es/icons/HeartFilled';
import HeartOutlined from '@ant-design/icons/es/icons/HeartOutlined';
import PageStatus from '../components/PageStatus';
import { getShowDetail } from '../api/movieApi';
import useAbortableRequest from '../hooks/useAbortableRequest';
import useMovieStore from '../store/useMovieStore';
import { FALLBACK_POSTER, sameItem } from '../utils/show';
import EpisodeList from '../components/EpisodeList';
import CastList from '../components/CastList';
import './Detail.css';

export default function Detail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const collects = useMovieStore((state) => state.collects);
    const toggleCollect = useMovieStore((state) => state.toggleCollect);
    const [show, setShow] = useState(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState(id ? '' : '影视 ID 缺失');
    const [requestId, setRequestId] = useState(id);
    const collected = collects.some((item) => sameItem(item, { id, source: 'tvmaze' }));
    const { run, abort } = useAbortableRequest();

    if (requestId !== id) {
        setRequestId(id);
        setShow(null);
        setLoading(Boolean(id));
        setError(id ? '' : '影视 ID 缺失');
    }

    const load = useCallback(() => {
        if (!id) {
            abort();
            setError('影视 ID 缺失');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        run(async (signal) => {
            const data = await getShowDetail(id, signal);
            if (signal.aborted) return;
            setShow(data);
            setError('');
            setLoading(false);
        }).catch(() => {
            setError('详情加载失败，稍后重试');
            setLoading(false);
        });
    }, [id, run, abort]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <PageStatus status="loading" message="正在加载影视详情..." />;
    if (error) return <PageStatus status="error" message={error} onRetry={load} />;

    return (
        <section className="detail-page">
            <button className="back-btn" onClick={() => navigate(-1)}>← 返回上一页</button>
            {show ? (
                <div className="detail-card">

                    <img
                        className="detail-image"
                        src={show.image?.large || show.image?.medium || FALLBACK_POSTER}
                        alt={show.name}
                        width="320"
                        height="480"
                        fetchPriority="high"
                    />
                    <div className="detail-content">
                        <div className="detail-title-row">
                            <h2>{show.name}</h2>
                            <button
                                type="button"
                                className={collected ? 'detail-fav collected' : 'detail-fav'}
                                onClick={() => toggleCollect(show)}
                            >
                                {collected ? <HeartFilled /> : <HeartOutlined />}
                                {collected ? '已收藏' : '收藏'}
                            </button>
                        </div>
                        <p className="tags">{(show.genres || []).join(' / ') || '类型未知'} · {show.language || '语言未知'}</p>
                        <p>评分：{show.rating?.average || '暂未'} · 首播：{show.premiered || '未知'} · 时长：{show.runtime || '--'} 分钟</p>
                        <div className="summary" dangerouslySetInnerHTML={{ __html: show.summary || '<p>暂无简介</p>' }} />
                        <div className="detail-meta">
                            <div><strong>官方状态：</strong>{show.status}</div>
                            <div><strong>官网：</strong>{show.officialSite ? <a href={show.officialSite} target="_blank" rel="noreferrer">访问</a> : '无'}</div>
                        </div>
                    </div>
                </div>
            ) : null}
            {show && (
                <>
                    <EpisodeList showId={Number(id)} />
                    <CastList showId={Number(id)} />
                </>
            )}
            {!show && (
                <PageStatus status="empty" message="没有找到影视详情" />
            )}
        </section>
    );
}
