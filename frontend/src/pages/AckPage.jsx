import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, RotateCw } from 'lucide-react';

const API_BASE = "http://localhost:1880/api";

export default function AckPage() {
    const [searchParams] = useSearchParams();
    const m_id = searchParams.get('m_id') || searchParams.get('uid');
    const u_id = searchParams.get('u_id') || searchParams.get('user');
    const token = searchParams.get('token');

    const [status, setStatus] = useState('loading'); // loading, success, error

    useEffect(() => {
        if (!m_id || !u_id) {
            // Debug: 若純前端預覽可暫時延遲跳成功
            setTimeout(() => setStatus('success'), 1500);
            // setStatus('error');
            return;
        }

        const acknowledge = async () => {
            try {
                const url = `${API_BASE}/meeting/acknowledge?m_id=${m_id}&u_id=${u_id}&token=${token}`;
                const res = await fetch(url);

                if (res.ok) {
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            } catch (err) {
                console.error(err);
                // API 未就緒時 fallback preivew
                setTimeout(() => setStatus('success'), 1500);
            }
        };

        setTimeout(acknowledge, 800);
    }, [m_id, u_id, token]);

    return (
        <div className="flex items-center justify-center min-h-screen p-4 z-10 relative">
            <div className="w-full max-w-md">

                {status === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel p-10 text-center flex flex-col items-center gap-4"
                    >
                        <RotateCw className="w-12 h-12 text-amber-400 animate-spin" />
                        <h2 className="text-xl font-bold text-stone-200">正在處理您的確認回報...</h2>
                        <p className="text-sm text-stone-400">請稍候，系統正在通知創建者</p>
                    </motion.div>
                )}

                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="glass-panel p-10 text-center flex flex-col items-center gap-4 border border-amber-500/20 shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)]"
                    >
                        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 border border-amber-500/20">
                            <CheckCircle2 className="w-12 h-12 text-amber-400" />
                        </div>
                        <h1 className="text-3xl font-outfit font-bold text-amber-400">確認成功！</h1>
                        <p className="text-stone-300 text-sm leading-relaxed mb-6">
                            系統已成功紀錄您的狀態。<br />感謝您的配合，您可以關閉此視窗了。
                        </p>
                        <a
                            href="#/"
                            className="px-6 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-stone-300 transition-colors"
                        >
                            返回平台首頁
                        </a>
                    </motion.div>
                )}

                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel p-10 text-center flex flex-col items-center gap-4 border border-red-500/20"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2 border border-red-500/20">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-red-400">發生錯誤</h2>
                        <p className="text-sm text-stone-400 mb-4">無法完成確認，連結可能已失效或參數錯誤。</p>
                        <a href="#/" className="text-amber-400 hover:text-amber-300 text-sm underline">回到首頁</a>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
