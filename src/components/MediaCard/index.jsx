import { Link } from 'react-router-dom';
import HeartFilled from '@ant-design/icons/es/icons/HeartFilled';
import HeartOutlined from '@ant-design/icons/es/icons/HeartOutlined';
import { detailPath, posterOf } from '../../utils/show';
import './MediaCard.css';

export default function MediaCard({
    item,
    collected = false,
    onToggle,
    src,
    width = 210,
    height = 280,
    loading = 'lazy',
    fetchPriority,
    className = '',
    imageClassName = '',
    bodyClassName = '',
    titleAs: Title = 'span',
    children,
}) {
    return (
        <article className={`media-card ${className}`.trim()}>
            <button
                type="button"
                className={collected ? 'fav-btn collected' : 'fav-btn'}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggle?.(item);
                }}
            >
                {collected ? <HeartFilled /> : <HeartOutlined />}
                {collected ? '已收藏' : '收藏'}
            </button>
            <Link to={detailPath(item)} className="media-card-link">
                <img
                    className={imageClassName}
                    src={src || posterOf(item)}
                    alt={item.name}
                    loading={loading}
                    width={width}
                    height={height}
                    fetchPriority={fetchPriority}
                />
                {bodyClassName ? (
                    <div className={bodyClassName}>
                        <Title>{item.name}</Title>
                        {children}
                    </div>
                ) : (
                    <Title>{item.name}</Title>
                )}
            </Link>
        </article>
    );
}
