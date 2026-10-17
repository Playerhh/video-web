import useMovieStore from '../store/useMovieStore';
import MovieList from '../components/MovieList';
import PageStatus from '../components/PageStatus';
import './Catalog.css';

export default function Favorites() {
    const collects = useMovieStore((state) => state.collects);

    return (
        <section className="favorites-page">
            <h1>我的收藏</h1>
            <p>收藏保存在这台浏览器里，刷新后仍然能看到海报和标题。</p>
            <PageStatus
                status={collects.length ? 'ready' : 'empty'}
                message="还没有收藏。在卡片或详情页点收藏即可。"
            >
                <MovieList movies={collects} />
            </PageStatus>
        </section>
    );
}
