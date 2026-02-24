import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { LogOut, Plus, Settings, Calendar as CalendarIcon } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, hasAdminRights, isSuperAdmin } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl z-10 relative">
            <header className="flex justify-between items-center mb-12">
                <h1 className="font-outfit text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    HOAmeet
                </h1>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <span className="text-sm font-semibold">{user?.name || '使用者'}</span>
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold shadow-sm">
                        {user?.name?.substring(0, 1) || '?'}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Meeting List */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 glass-panel p-8"
                >
                    <h2 className="font-outfit text-xl mb-6 flex items-center gap-2 text-slate-100">
                        <CalendarIcon className="w-5 h-5 text-indigo-400" />
                        我的會議清單
                    </h2>

                    <div className="space-y-4">
                        {/* 模擬會議 1 */}
                        <div
                            onClick={() => navigate('/calendar/1')}
                            className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center cursor-pointer hover:bg-white/10 hover:border-indigo-400 transition-all"
                        >
                            <div>
                                <h3 className="text-lg font-semibold mb-1 text-slate-200 group-hover:text-indigo-300 transition-colors">「績效評估優化」第二次籌備會議</h3>
                                <p className="text-sm text-slate-400">發起人：陳大文 組長 | 參與人數：12 人</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                調查中
                            </span>
                        </div>

                        {/* 模擬會議 2 */}
                        <div
                            onClick={() => navigate('/calendar/2')}
                            className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center cursor-pointer hover:bg-white/10 hover:border-emerald-400 transition-all"
                        >
                            <div>
                                <h3 className="text-lg font-semibold mb-1 text-slate-200 group-hover:text-emerald-300 transition-colors">2026 年度預算審核</h3>
                                <p className="text-sm text-slate-400">發起人：王浩宇 局長 | 參與人數：8 人</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                已拍板
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Actions */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel p-8 h-fit"
                >
                    <h2 className="font-outfit text-xl mb-6 flex items-center gap-2 text-slate-100">
                        <Settings className="w-5 h-5 text-slate-400" />
                        快速操作
                    </h2>

                    <div className="flex flex-col gap-4">
                        {/* RBAC: Creator or Super Admin */}
                        {hasAdminRights() && (
                            <button className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/20">
                                <Plus className="w-5 h-5" /> 發起新會議
                            </button>
                        )}

                        {/* RBAC: Super Admin Only */}
                        {isSuperAdmin() && (
                            <Link to="/admin/users" className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-rose-500/20">
                                <Settings className="w-5 h-5" /> 系統權限管理
                            </Link>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all text-slate-300"
                        >
                            <LogOut className="w-5 h-5" /> 登出系統
                        </button>
                    </div>

                    {/* Hint for normal users */}
                    {!hasAdminRights() && (
                        <p className="mt-6 text-xs text-center text-slate-500">
                            💡 您目前為一般參與者，若需發起會議請聯絡管理員。
                        </p>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
