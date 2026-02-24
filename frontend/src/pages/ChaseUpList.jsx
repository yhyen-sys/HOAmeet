import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import Header from '../components/Header';

export default function ChaseUpList() {
    const { id: meetingId } = useParams();
    const navigate = useNavigate();
    const { hasAdminRights } = useAuthStore();
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        // 實務上應檢查權限並呼叫 API 取得追蹤清單
        if (!hasAdminRights()) {
            alert("無存取權限！");
            navigate('/dashboard');
            return;
        }

        setParticipants([
            { id: 1, name: "王浩宇 局長", dept: "政府機關", status: "acknowledged" },
            { id: 2, name: "林雪柔 專員", dept: "學術單位", status: "pending" },
            { id: 3, name: "張智傑 助理", dept: "公共關係室", status: "pending" }
        ]);
    }, [meetingId, hasAdminRights, navigate]);

    const remindAll = () => {
        // 實務上這裡可以呼叫後端 API 觸發 Email 發送機制
        console.log("Triggering reminder to pending users...");
        alert("✉️ 提醒信已成功發送給尚未確認的成員！");
    };

    const acknowledged = participants.filter(p => p.status === 'acknowledged');
    const pending = participants.filter(p => p.status === 'pending');

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl z-10 relative">
            <Header
                title={<span>📊 會議更動通知追蹤</span>}
                description={`會議編號 #${meetingId} 的更動收悉回報狀況`}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 已確認 */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel p-6 border border-amber-500/20 shadow-amber-500/5"
                >
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-amber-400">
                        <CheckCircle2 className="w-6 h-6" /> 🟢 已確認收悉 ({acknowledged.length})
                    </h2>

                    <ul className="space-y-3">
                        {acknowledged.map(p => (
                            <li key={p.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center hover:bg-white/10 transition-colors">
                                <div>
                                    <div className="font-semibold text-stone-200">{p.name}</div>
                                    <div className="text-xs text-stone-400">{p.dept}</div>
                                </div>
                                <span className="text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full text-xs border border-amber-500/20">已讀</span>
                            </li>
                        ))}
                        {acknowledged.length === 0 && <li className="text-stone-500 text-sm p-4 text-center">暫無已確認成員</li>}
                    </ul>
                </motion.div>

                {/* 尚未確認 */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel p-6 border border-red-500/20 shadow-red-500/5"
                >
                    <h2 className="text-xl font-bold flex items-center justify-between mb-6 text-red-400">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-6 h-6" /> 🔴 尚未確認 ({pending.length})
                        </div>
                        {pending.length > 0 && (
                            <button
                                onClick={remindAll}
                                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-amber-500/20"
                            >
                                <Mail className="w-3 h-3" /> 一鍵催繳
                            </button>
                        )}
                    </h2>

                    <ul className="space-y-3">
                        {pending.map(p => (
                            <li key={p.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                                <div>
                                    <div className="font-semibold text-stone-200">{p.name}</div>
                                    <div className="text-xs text-stone-400">{p.dept}</div>
                                </div>
                                <span className="text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full text-xs border border-red-500/20">未讀</span>
                            </li>
                        ))}
                        {pending.length === 0 && <li className="text-stone-500 text-sm p-4 text-center">所有成員皆已確認！🎉</li>}
                    </ul>
                </motion.div>

            </div>
        </div>
    );
}
