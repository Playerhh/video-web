import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Empty from 'antd/es/empty';
import Skeleton from 'antd/es/skeleton';
import './PageStatus.css';

export default function PageStatus({ status = 'ready', message = '', onRetry, children }) {
    if (status === 'loading') {
        return (
            <div className="page-status">
                <Skeleton.Image active style={{ width: 210, height: 280 }} />
                {message ? <p className="page-status-text">{message}</p> : null}
            </div>
        );
    }

    if (status === 'info') {
        return (
            <Alert
                className="page-status-alert"
                type="info"
                showIcon
                title={message || '暂无更多说明'}
            />
        );
    }

    if (status === 'error') {
        return (
            <Alert
                className="page-status-alert"
                type="error"
                showIcon
                title={message || '请求失败，请稍后重试。'}
                action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined}
            />
        );
    }

    if (status === 'empty') {
        return <Empty description={message || '暂无数据'} />;
    }

    return children;
}
