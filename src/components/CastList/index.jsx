import { useCallback, useEffect, useState } from 'react';
import PageStatus from '../PageStatus';
import useAbortableRequest from '../../hooks/useAbortableRequest';
import useDetailStore from '../../store/useDetailStore';
import { FALLBACK_POSTER } from '../../utils/show';
import '../EpisodeList/EpisodeList.css';

const PREVIEW_COUNT = 12;

export default function CastList({ showId, cast: castProp, loading = false, error = '', onRetry }) {
    const provided = castProp !== undefined;
    const entry = useDetailStore((state) => (provided ? undefined : state.entries[showId]));
    const cast = provided ? castProp : entry?.cast;
    const [expandedFor, setExpandedFor] = useState(showId);
    const [expanded, setExpanded] = useState(false);
    const { start } = useAbortableRequest();
    const load = useCallback(() => {
        const signal = start();
        useDetailStore.getState().loadCast(showId, signal);
    }, [showId, start]);

    useEffect(() => {
        if (provided) return undefined;
        load();
    }, [load, provided]);

    if (expandedFor !== showId) {
        setExpandedFor(showId);
        setExpanded(false);
    }

    const retry = onRetry || load;

    const visible = expanded || !cast ? cast : cast.slice(0, PREVIEW_COUNT);

    return (
        <section className="cast-panel">
            <h3>演员</h3>
            {(!cast || cast.length === 0) && (provided ? loading : entry?.castLoading !== false) && !(provided ? error : entry?.castError) && (
                <PageStatus status="loading" message="正在加载演员..." />
            )}
            {(provided ? error : entry?.castError) && (!cast || cast.length === 0) && (
                <PageStatus status="error" message={provided ? error : entry.castError} onRetry={retry} />
            )}
            {cast && cast.length === 0 && !(provided ? loading : entry?.castLoading) && !(provided ? error : entry?.castError) && (
                <PageStatus status="empty" message="暂无演员信息" />
            )}
            {visible && visible.length > 0 && (
                <div className="cast-list">
                    {visible.map((member, index) => (
                        <article key={`${member.id}-${member.character}-${index}`} className="cast-card">
                            <img src={member.image?.medium || FALLBACK_POSTER} alt={member.name} loading="lazy" width="116" height="156" />
                            <strong>{member.name}</strong>
                            <span>{member.character}</span>
                        </article>
                    ))}
                </div>
            )}
            {cast && cast.length > PREVIEW_COUNT && (
                <button type="button" className="cast-more" onClick={() => setExpanded((value) => !value)}>
                    {expanded ? '收起' : `展开其余 ${cast.length - PREVIEW_COUNT} 人`}
                </button>
            )}
        </section>
    );
}
