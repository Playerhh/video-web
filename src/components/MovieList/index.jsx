import { useMemo } from 'react';
import MediaCard from '../MediaCard';
import useMovieStore from '../../store/useMovieStore';
import { itemKey } from '../../utils/show';
import './MovieList.css';

export default function MovieList({ movies = [] }) {
    const collects = useMovieStore((state) => state.collects);
    const toggleCollect = useMovieStore((state) => state.toggleCollect);
    const collectedKeys = useMemo(() => new Set(collects.map((item) => itemKey(item))), [collects]);

    if (!movies.length) return null;

    return (
        <div className="movie-grid">
            {movies.map((movie) => (
                <MediaCard
                    key={itemKey(movie)}
                    item={movie}
                    collected={collectedKeys.has(itemKey(movie))}
                    onToggle={toggleCollect}
                    width={210}
                    height={280}
                    className="movie-card"
                    imageClassName="movie-poster"
                    bodyClassName="movie-info"
                    titleAs="h3"
                >
                    <p>{movie.genres?.join(' / ') || '类型未知'}</p>
                    <p>评分：{movie.rating?.average ?? 'N/A'}</p>
                    <p className="movie-summary">{movie.summary || '暂无简介'}</p>
                </MediaCard>
            ))}
        </div>
    );
}
