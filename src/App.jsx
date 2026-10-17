import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import PageStatus from './components/PageStatus';
import { loadCatalogPage } from './routes/catalog';
import './App.css';

const Search = lazy(() => import('./pages/Search'));
const Detail = lazy(() => import('./pages/Detail'));
const Catalog = lazy(loadCatalogPage);
const MovieCatalog = lazy(() => import('./pages/MovieCatalog'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Login = lazy(() => import('./pages/Login'));

function LazyPage({ page: Page }) {
  return (
    <Suspense fallback={<PageStatus status="loading" message="加载中..." />}>
      <Page />
    </Suspense>
  );
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Home />} />
          <Route path='category/movie' element={<LazyPage page={MovieCatalog} />} />
          <Route path='category/:kind' element={<LazyPage page={Catalog} />} />
          <Route path='movie/:id' element={<LazyPage page={MovieDetail} />} />
          <Route path='genre/:genre' element={<LazyPage page={Catalog} />} />
          <Route path='favorites' element={<LazyPage page={Favorites} />} />
          <Route path='login' element={<LazyPage page={Login} />} />
          <Route path='search' element={<LazyPage page={Search} />} />
          <Route path='detail/:id' element={<LazyPage page={Detail} />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
