import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageStatus from '../PageStatus';
import useAbortableRequest from '../../hooks/useAbortableRequest';
import useDetailStore from '../../store/useDetailStore';
import { groupEpisodes } from '../../utils/show';
import './EpisodeList.css';

function regularSeasons(groups) {
    return groups.filter((group) => group.season > 0);
}

function fallbackSeason(groups) {
    if (groups.some((group) => group.season === 1)) return 1;
    return groups[0]?.season ?? 0;
}

function defaultSeason(groups) {
    const regular = regularSeasons(groups);
    if (regular.length) return regular[regular.length - 1].season;
    return groups[0]?.season ?? 0;
}

function parseSeason(value) {
    if (value == null || value === '') return null;
    if (value === 'special') return 0;
    const season = Number(value);
    return Number.isInteger(season) && season >= 0 ? season : null;
}

export default function EpisodeList({ showId }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const entry = useDetailStore((state) => state.entries[showId]);
    const progress = useDetailStore((state) => state.progress[showId]);
    const progressWarning = useDetailStore((state) => state.progressWarning);
    const markProgress = useDetailStore((state) => state.markProgress);
    const episodes = entry?.episodes;
    const groups = useMemo(() => groupEpisodes(episodes || []), [episodes]);
    const { start } = useAbortableRequest();

    const load = useCallback(() => {
        const signal = start();
        useDetailStore.getState().loadEpisodes(showId, signal);
    }, [showId, start]);

    useEffect(() => {
        load();
    }, [load]);

    const requested = parseSeason(searchParams.get('season'));
    const available = groups.some((group) => group.season === requested);
    const selected = requested == null
        ? defaultSeason(groups)
        : (available ? requested : fallbackSeason(groups));
    const currentGroup = groups.find((group) => group.season === selected);

    useEffect(() => {
        if (!episodes?.length || requested == null || available) return;
        const fallback = String(fallbackSeason(groups));
        if (searchParams.get('season') === fallback) return;
        const next = new URLSearchParams(searchParams);
        next.set('season', fallback);
        setSearchParams(next, { replace: true });
    }, [available, episodes, groups, requested, searchParams, setSearchParams]);

    const chooseSeason = (season) => {
        const next = new URLSearchParams(searchParams);
        next.set('season', String(season));
        setSearchParams(next);
    };

    const retry = () => load();

    return (
        <section className="episode-panel">
            <h3>分集</h3>
            {!episodes && entry?.episodesLoading !== false && !entry?.episodesError && (
                <PageStatus status="loading" message="正在加载分集..." />
            )}
            {entry?.episodesError && !episodes && (
                <PageStatus status="error" message={entry.episodesError} onRetry={retry} />
            )}
            {episodes && groups.length === 0 && <PageStatus status="empty" message="暂无分集" />}
            {currentGroup && (
                <>
                    <div className="season-tabs">
                        {groups.map((group) => (
                            <button
                                key={group.season}
                                type="button"
                                className={group.season === selected ? 'season-tab active' : 'season-tab'}
                                onClick={() => chooseSeason(group.season)}
                            >
                                {group.label}
                            </button>
                        ))}
                    </div>
                    {progressWarning && <p className="progress-warning">{progressWarning}</p>}
                    <div className="episode-list">
                        {currentGroup.episodes.map((episode) => {
                            const marked = progress?.episodeId === episode.id;
                            return (
                                <article key={episode.id} className={marked ? 'episode-row current' : 'episode-row'}>
                                    <div className="episode-main">
                                        <strong>
                                            {episode.number ? `第 ${episode.number} 集` : '未编号'}
                                            {' · '}
                                            {episode.name}
                                        </strong>
                                        <p>
                                            {episode.airdate || '播出日期未知'}
                                            {' · 评分：'}
                                            {episode.rating?.average ?? '暂无'}
                                        </p>
                                        <p>{episode.summary || '暂无简介'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={marked ? 'progress-btn current' : 'progress-btn'}
                                        onClick={() => markProgress(showId, episode)}
                                    >
                                        {marked ? '上次看到' : '看到这集'}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
