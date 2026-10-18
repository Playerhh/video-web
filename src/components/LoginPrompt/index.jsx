import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import './LoginPrompt.css';

export default function LoginPrompt() {
    const open = useAuthStore((state) => state.loginPrompt);
    const dismiss = useAuthStore((state) => state.dismissLoginPrompt);
    const { pathname } = useLocation();
    const navigate = useNavigate();

    if (!open || pathname === '/login') return null;

    return createPortal(
        <div className="login-prompt" role="dialog" aria-label="请登录">
            <p>请先登录</p>
            <button type="button" className="login-prompt-go" onClick={() => navigate('/login')}>
                去登录
            </button>
            <button type="button" className="login-prompt-close" aria-label="关闭" onClick={dismiss}>
                ×
            </button>
        </div>,
        document.body,
    );
}
