import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, LogOut } from 'lucide-react';

export default function Header({ title, description, hideBack = false, showUser = false, customRightAction }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 如果未強制隱藏且不是首頁，則顯示返回按鈕
    const shouldShowBack = !hideBack && location.pathname !== '/dashboard';

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 w-full">
            <div>
                {/* 標題與副標題 */}
                {typeof title === 'string' ? (
                    <h1 className="font-outfit text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-600 flex items-center gap-2">
                        {title}
                    </h1>
                ) : (
                    <div className="flex items-center gap-2 font-outfit text-3xl font-bold text-stone-100">
                        {title}
                    </div>
                )}
                {description && <p className="text-stone-400 mt-1 text-sm">{description}</p>}
            </div>

            <div className="flex items-center gap-3">
                {/* 自訂義的右側操作 (例如 AdminUsers 的 SUPER ADMIN 標籤) */}
                {customRightAction}

                {/* 顯示使用者頭像 (主要用於 Dashboard) */}
                {showUser && user && (
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                        <span className="text-sm font-semibold">{user.name || '使用者'}</span>
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold shadow-sm text-stone-900">
                            {user.name?.substring(0, 1) || '?'}
                        </div>
                    </div>
                )}

                {/* 全局返回按鈕 */}
                {shouldShowBack && (
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-stone-300 text-sm active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" /> 返回
                    </button>
                )}

                {/* 全局登出按鈕 */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors text-red-400 text-sm active:scale-95 ml-2"
                >
                    <LogOut className="w-4 h-4" /> 登出
                </button>
            </div>
        </header>
    );
}
