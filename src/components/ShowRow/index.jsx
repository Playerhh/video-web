import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import MediaCard from '../MediaCard';
import PageStatus from '../PageStatus';
import useMovieStore from '../../store/useMovieStore';
import { itemKey } from '../../utils/show';
import './ShowRow.css';

export default function ShowRow({
    title,
    to,
    shows = [],
    status = 'ready',
    message = '这一类暂时没有数据',
    onRetry,
}) {
    const collects = useMovieStore((state) => state.collects);
    const toggleCollect = useMovieStore((state) => state.toggleCollect);
    const collectedKeys = useMemo(() => new Set(collects.map((item) => itemKey(item))), [collects]);
    const rowStatus = shows.length ? 'ready' : status;

    return (
        <section className="show-row">
            <div className="show-row-head">
                <h2>{title}</h2>
                <Link to={to}>查看全部</Link>
            </div>
            <PageStatus status={rowStatus} message={message} onRetry={onRetry}>
                <div className="show-row-scroller">
                    {shows.map((show) => (
                        <MediaCard
                            key={itemKey(show)}
                            item={show}
                            collected={collectedKeys.has(itemKey(show))}
                            onToggle={toggleCollect}
                            width={150}
                            height={210}
                            className="show-row-card"
                        />
                    ))}
                </div>
            </PageStatus>
        </section>
    );
}
