import { useEffect } from 'react';
import Pagination from 'antd/es/pagination';
import './CatalogPager.css';

export default function CatalogPager({ page, pageCount, onChange }) {
    useEffect(() => {
        const timer = window.setTimeout(() => {
            window.scrollTo(0, 0);
        }, 50);
        return () => window.clearTimeout(timer);
    }, [page]);

    if (pageCount <= 1) return null;

    const handleChange = (nextPage) => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        onChange(nextPage);
        window.scrollTo(0, 0);
    };

    return (
        <div className="catalog-pager">
            <Pagination
                current={page}
                pageSize={1}
                total={pageCount}
                showSizeChanger={false}
                onChange={handleChange}
            />
        </div>
    );
}
