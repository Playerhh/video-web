import './ErrorMessage.css';

export default function ErrorMessage({ message = '请求失败，请稍后重试。', onRetry }) {
    return (
        <div className="error-card">
            <span>⚠️ {message}</span>
            {onRetry && (
                <button type="button" className="retry-btn" onClick={onRetry}>
                    重试
                </button>
            )}
        </div>
    );
}
