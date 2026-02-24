import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchAPI } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Calendar as CalendarIcon, ChevronDown, AlignLeft, Info } from 'lucide-react';
import Header from '../components/Header';

export default function Dashboard() {
    const { hasAdminRights, isSuperAdmin } = useAuthStore();
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const loadMeetings = async () => {
            try {
                // 串接真實 API
                const res = await fetchAPI('/meetings/my');
                if (res.ok) {
                    const data = await res.json();
                    setMeetings(data);
                } else {
                    console.error("無法取得會議資料", await res.text());
                }
            } catch (error) {
                console.error("系統錯誤:", error);
            } finally {
                setLoading(false);
            }
        };
        loadMeetings();
    }, []);

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

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

                    {loading ? (
                        <div className="text-center py-12 text-stone-500 animate-pulse">
                            載入中...
                        </div>
                    ) : meetings.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            <p className="text-stone-400 mb-2">目前沒有任何會議</p>
                            <p className="text-sm text-stone-500">當您受到邀請或發起會議時，將會顯示於此。</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {meetings.map((m) => {
                                const isConfirmed = m.status === 'confirmed';
                                const isExpanded = expandedId === m.id;

                                return (
                                    <div key={m.id} className={`group bg-white/5 border border-white/10 rounded-2xl transition-all ${isExpanded ? 'bg-white/10 border-amber-500/30' : 'hover:bg-white/10 hover:border-amber-400/50'}`}>
                                        {/* Header Row */}
                                        <div
                                            onClick={() => isConfirmed ? toggleExpand(m.id) : navigate(`/calendar/${m.id}`)}
                                            className="p-6 flex justify-between items-center cursor-pointer"
                                        >
                                            <div className="flex-1 pr-4">
                                                <h3 className="text-lg font-semibold mb-1 text-stone-200 group-hover:text-amber-300 transition-colors">
                                                    {m.title}
                                                </h3>
                                                <p className="text-sm text-stone-400">
                                                    發起人：{m.admin_last_name}{m.admin_first_name} {m.admin_title_name}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isConfirmed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                                    {isConfirmed ? '已拍板' : '調查中'}
                                                </span>
                                                {isConfirmed && (
                                                    <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Content (Only for Confirmed) */}
                                        <AnimatePresence>
                                            {isConfirmed && isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden border-t border-white/10"
                                                >
                                                    <div className="p-6 bg-black/20 space-y-4 text-sm text-stone-300">
                                                        {m.subject && (
                                                            <div>
                                                                <h4 className="flex items-center gap-2 font-semibold text-amber-500 mb-1">
                                                                    <Info className="w-4 h-4" /> 討論主旨
                                                                </h4>
                                                                <p className="pl-6 whitespace-pre-wrap">{m.subject}</p>
                                                            </div>
                                                        )}
                                                        {m.agenda && (
                                                            <div>
                                                                <h4 className="flex items-center gap-2 font-semibold text-amber-500 mb-1">
                                                                    <AlignLeft className="w-4 h-4" /> 預定議程
                                                                </h4>
                                                                <p className="pl-6 whitespace-pre-wrap">{m.agenda}</p>
                                                            </div>
                                                        )}
                                                        {m.discussion_points && (
                                                            <div>
                                                                <h4 className="flex items-center gap-2 font-semibold text-amber-500 mb-1">
                                                                    <Settings className="w-4 h-4" /> 重點提示
                                                                </h4>
                                                                <p className="pl-6 whitespace-pre-wrap">{m.discussion_points}</p>
                                                            </div>
                                                        )}
                                                        <div className="pt-4 flex justify-end">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/calendar/${m.id}`); }}
                                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-amber-400 rounded-lg text-xs font-semibold transition-colors border border-amber-500/30 hover:border-amber-400"
                                                            >
                                                                查看完整名單與報表 &rarr;
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                            <button onClick={() => navigate('/meetings/new')} className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
                                <Plus className="w-5 h-5" /> 發起新會議
                            </button>
                        )}

                        {/* RBAC: Super Admin Only */}
                        {isSuperAdmin() && (
                            <Link to="/admin/users" className="w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
                                <Settings className="w-5 h-5" /> 系統權限管理
                            </Link>
                        )}
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
