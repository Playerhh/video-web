import useAuthStore from '../store/useAuthStore';
import useMovieStore from '../store/useMovieStore';
import MovieList from '../components/MovieList';
import PageStatus from '../components/PageStatus';
import './Catalog.css';

export default function Favorites() {
    const user = useAuthStore((state) => state.user);
    const collects = useMovieStore((state) => state.collects);

    return (
        <section className="favorites-page">
            <h1>我的收藏</h1>
            <p>
                {user
                    ? '这些收藏跟当前账号走，退出登录后不再显示。'
                    : '现在未登录，这里只显示这台浏览器里未登录时收藏的内容。'}
            </p>
            <PageStatus
                status={collects.length ? 'ready' : 'empty'}
                message="还没有收藏。在卡片或详情页点收藏即可。"
            >
                <MovieList movies={collects} />
            </PageStatus>
        </section>
    );
}
