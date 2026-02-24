import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { LogOut, Plus, Settings, Calendar as CalendarIcon } from 'lucide-react';
import Header from '../components/Header';

export default function Dashboard() {
    const { hasAdminRights, isSuperAdmin } = useAuthStore(); // user and logout handled by Header now

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl z-10 relative">
            <Header title="HOAmeet" showUser={true} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Meeting List */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 glass-panel p-8"
                >
                    <h2 className="font-outfit text-xl mb-6 flex items-center gap-2 text-stone-100">
                        <CalendarIcon className="w-5 h-5 text-amber-400" />
                        我的會議清單
                    </h2>

                    <div className="space-y-4">
                        {/* 模擬會議 1 */}
                        <div
                            onClick={() => navigate('/calendar/1')}
                            className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center cursor-pointer hover:bg-white/10 hover:border-amber-400 transition-all"
                        >
                            <div>
                                <h3 className="text-lg font-semibold mb-1 text-stone-200 group-hover:text-amber-300 transition-colors">「績效評估優化」第二次籌備會議</h3>
                                <p className="text-sm text-stone-400">發起人：陳大文 組長 | 參與人數：12 人</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                調查中
                            </span>
                        </div>

                        {/* 模擬會議 2 */}
                        <div
                            onClick={() => navigate('/calendar/2')}
                            className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center cursor-pointer hover:bg-white/10 hover:border-amber-400 transition-all"
                        >
                            <div>
                                <h3 className="text-lg font-semibold mb-1 text-stone-200 group-hover:text-amber-300 transition-colors">2026 年度預算審核</h3>
                                <p className="text-sm text-stone-400">發起人：王浩宇 局長 | 參與人數：8 人</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
                    <h2 className="font-outfit text-xl mb-6 flex items-center gap-2 text-stone-100">
                        <Settings className="w-5 h-5 text-stone-400" />
                        快速操作
                    </h2>

                    <div className="flex flex-col gap-4">
                        {/* RBAC: Creator or Super Admin */}
                        {hasAdminRights() && (
                            <button className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
                                <Plus className="w-5 h-5" /> 發起新會議
                            </button>
                        )}

                        {/* RBAC: Super Admin Only */}
                        {isSuperAdmin() && (
                            <Link to="/admin/users" className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
                                <Settings className="w-5 h-5" /> 系統權限管理
                            </Link>
                        )}

                        {/* LogOut button removed here as it's now in the Header */}
                    </div>

                    {/* Hint for normal users */}
                    {!hasAdminRights() && (
                        <p className="mt-6 text-xs text-center text-stone-500">
                            💡 您目前為一般參與者，若需發起會議請聯絡管理員。
                        </p>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
