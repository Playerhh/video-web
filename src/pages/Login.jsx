import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import LoginPending from '../components/LoginPending';
import useAuthStore from '../store/useAuthStore';
import './Login.css';

const USERNAME_PATTERN = /^[\w\u4e00-\u9fa5]{3,20}$/;

export default function Login() {
    const user = useAuthStore((state) => state.user);
    const ready = useAuthStore((state) => state.ready);
    const submit = useAuthStore((state) => state.submit);
    const [form] = Form.useForm();
    const [mode, setMode] = useState('login');
    const [pending, setPending] = useState(false);

    if (!ready) return <LoginPending />;
    if (user) return <Navigate to="/favorites" replace />;

    const handleSubmit = async (values) => {
        setPending(true);
        try {
            await submit(mode, values.username.trim(), values.password);
        } catch (requestError) {
            const message = requestError.message || '登录失败';
            const name = message.includes('用户名') ? 'username' : 'password';
            form.setFields([{ name, errors: [message] }]);
        } finally {
            setPending(false);
        }
    };

    return (
        <section className="login-page">
            <h1>{mode === 'register' ? '注册' : '登录'}</h1>
            <p>登录后，收藏和看到哪一集会跟这个账号走。未登录时仍只保存在这台浏览器。</p>
            <Form
                form={form}
                className="login-form"
                layout="vertical"
                noValidate
                onFinish={handleSubmit}
                autoComplete="on"
            >
                <Form.Item
                    label="用户名"
                    name="username"
                    rules={[{
                        validator: (_, value) => (
                            USERNAME_PATTERN.test(String(value || '').trim())
                                ? Promise.resolve()
                                : Promise.reject(new Error('用户名需要 3 到 20 个字符'))
                        ),
                    }]}
                >
                    <Input autoComplete="username" />
                </Form.Item>
                <Form.Item
                    label="密码"
                    name="password"
                    rules={[{
                        validator: (_, value) => (
                            String(value || '').length >= 8
                                ? Promise.resolve()
                                : Promise.reject(new Error('密码至少 8 位'))
                        ),
                    }]}
                >
                    <Input.Password autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={pending} disabled={pending}>
                    {mode === 'register' ? '注册并登录' : '登录'}
                </Button>
            </Form>
            <Button
                className="login-switch"
                block
                onClick={() => {
                    setMode(mode === 'register' ? 'login' : 'register');
                    form.setFields([
                        { name: 'username', errors: [] },
                        { name: 'password', errors: [] },
                    ]);
                }}
            >
                {mode === 'register' ? '已有账号，去登录' : '没有账号，去注册'}
            </Button>
        </section>
    );
}
