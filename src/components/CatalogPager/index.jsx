import Pagination from 'antd/es/pagination';
import './CatalogPager.css';

export default function CatalogPager({ page, pageCount, onChange }) {
    if (pageCount <= 1) return null;

    return (
        <div className="catalog-pager">
            <Pagination
                current={page}
                pageSize={1}
                total={pageCount}
                showSizeChanger={false}
                onChange={onChange}
            />
        </div>
    );
}
