// filepath: src/components/SearchBox/index.jsx
// 使用 Zustand 全局状态管理
import { useCallback, useEffect, useState } from 'react';
import useSearchStore from '../../store/useSearchStore';  // 引入 Zustand store
import './SearchBox.css';

export default function SearchBox({ value = '', placeholder = '输入影视名称，回车搜索', onSearch }) {
    // ========== 使用 Zustand 全局状态 ==========
    // 从 store 中获取状态和方法
    const searchHistory = useSearchStore((state) => state.searchHistory);
    const setKeyword = useSearchStore((state) => state.setKeyword);
    const addToHistory = useSearchStore((state) => state.addToHistory);
    const clearHistory = useSearchStore((state) => state.clearHistory);
    const initHistory = useSearchStore((state) => state.initHistory);

    // 本地状态：用于受控输入
    const [localKeyword, setLocalKeyword] = useState(value);

    // 初始化：页面加载时从 localStorage 恢复搜索历史
    useEffect(() => {
        initHistory();
    }, [initHistory]);

    // 同步外部传入的 value
    useEffect(() => {
        setLocalKeyword(value);
    }, [value]);

    const handleSearchConfirm = useCallback((text) => {
        if (!text) return;
        setKeyword(text);
        addToHistory(text);
        onSearch?.(text);
    }, [addToHistory, onSearch, setKeyword]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmed = localKeyword.trim();
            if (trimmed.length >= 2) {
                handleSearchConfirm(trimmed);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [handleSearchConfirm, localKeyword]);

    const handleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearchConfirm(localKeyword.trim());
            }
        },
        [handleSearchConfirm, localKeyword]
    );

    // ========== 清空搜索历史 ==========
    const handleClearHistory = () => {
        clearHistory();
    };

    // ========== 点击历史标签搜索 ==========
    const handleHistoryClick = (item) => {
        setLocalKeyword(item);
        handleSearchConfirm(item);
    };

    return (
        <div className="search-container">
            <div className="search-box">
                <input
                    className="search-input"
                    value={localKeyword}
                    onChange={(e) => setLocalKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                />
                <button
                    className="search-btn"
                    onClick={() => handleSearchConfirm(localKeyword.trim())}
                >
                    搜索
                </button>
            </div>
            {/* 搜索历史展示 */}
            {searchHistory.length > 0 && (
                <div className="search-history">
                    <div className="history-header">
                        <span>搜索历史</span>
                        <button className="clear-history-btn" onClick={handleClearHistory}>
                            清空
                        </button>
                    </div>
                    <div className="history-tags">
                        {searchHistory.map((item, index) => (
                            <span
                                key={index}
                                className="history-tag"
                                onClick={() => handleHistoryClick(item)}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}