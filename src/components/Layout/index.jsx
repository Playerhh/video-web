import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AntdApp from 'antd/es/app';
import Drawer from 'antd/es/drawer';
import Dropdown from 'antd/es/dropdown';
import Grid from 'antd/es/grid';
import Space from 'antd/es/space';
import DownOutlined from '@ant-design/icons/es/icons/DownOutlined';
import MenuOutlined from '@ant-design/icons/es/icons/MenuOutlined';
import { GENRES } from '../../constants/catalog';
import { bindNotice } from '../../sync/notify';
import useAuthStore from '../../store/useAuthStore';
import useMovieStore from '../../store/useMovieStore';
import ErrorMessage from '../ErrorMessage';
import './Layout.css';

const NAV_LINKS = [
    { to: '/', label: '首页', end: true },
    { to: '/category/tv', label: '剧集' },
    { to: '/category/anime', label: '动画' },
    { to: '/category/docs', label: '纪录片' },
    { to: '/category/movie', label: '电影' },
    { to: '/favorites', label: '收藏' },
    { to: '/search', label: '搜索' },
];

export default function Layout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const initCollects = useMovieStore((state) => state.initCollects);
    const storageWarning = useMovieStore((state) => state.storageWarning);
    const user = useAuthStore((state) => state.user);
    const syncWarning = useAuthStore((state) => state.syncWarning);
    const logout = useAuthStore((state) => state.logout);
    const { message } = AntdApp.useApp();
    const screens = Grid.useBreakpoint();
    const isPhone = screens.md === false;
    const [navOpen, setNavOpen] = useState(false);

    useEffect(() => {
        initCollects();
        useAuthStore.getState().init();
    }, [initCollects]);

    useEffect(() => bindNotice((text) => message.error(text)), [message]);

    useEffect(() => {
        setNavOpen(false);
    }, [pathname, isPhone]);

    const closeNav = () => setNavOpen(false);

    const menuItems = GENRES.map((item) => ({
        key: item.key,
        label: item.label,
        onClick: () => {
            closeNav();
            navigate(`/genre/${encodeURIComponent(item.key)}`);
        },
    }));

    const linkClass = (to, end = false) => {
        const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
        return active ? 'nav-link active' : 'nav-link';
    };

    const nav = (
        <>
            {NAV_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className={linkClass(item.to, item.end)} onClick={closeNav}>
                    {item.label}
                </Link>
            ))}
            {user ? (
                <>
                    <span className="nav-user">{user.username}</span>
                    <button
                        type="button"
                        className="nav-link"
                        onClick={() => {
                            closeNav();
                            logout();
                        }}
                    >
                        退出
                    </button>
                </>
            ) : (
                <Link to="/login" className={linkClass('/login')} onClick={closeNav}>
                    登录
                </Link>
            )}
            <Dropdown menu={{ items: menuItems }} trigger={['click', 'hover']} placement="bottomLeft" arrow>
                <span className={pathname.startsWith('/genre') ? 'nav-link active' : 'nav-link'}>
                    <Space>
                        题材
                        <DownOutlined />
                    </Space>
                </span>
            </Dropdown>
        </>
    );

    return (
        <div className="app-shell">
            <header className="app-header">
                <Link to="/" className="brand-title" onClick={closeNav}>影视聚合平台</Link>
                {isPhone ? (
                    <button
                        type="button"
                        className="nav-menu-btn"
                        aria-label="打开菜单"
                        aria-expanded={navOpen}
                        onClick={() => setNavOpen(true)}
                    >
                        <MenuOutlined />
                    </button>
                ) : (
                    <nav className="top-nav" aria-label="主导航">
                        {nav}
                    </nav>
                )}
            </header>
            {isPhone && (
                <Drawer
                    title="导航"
                    placement="left"
                    size={280}
                    open={navOpen}
                    onClose={closeNav}
                >
                    <nav className="drawer-nav" aria-label="主导航">
                        {nav}
                    </nav>
                </Drawer>
            )}
            <main className="app-content">
                {storageWarning && <ErrorMessage message={storageWarning} />}
                {syncWarning && <ErrorMessage message={syncWarning} />}
                <Outlet />
            </main>
            <footer className="app-footer">
                影视聚合平台 by helen
            </footer>
        </div>
    );
}
