import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Users, CheckCircle2, FileText, Plus, Trash2, UserCheck, Search } from 'lucide-react';
import Header from '../components/Header';
import { fetchAPI } from '../utils/api';

export default function CreateMeeting() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // 全站用戶清單快取
    const [userList, setUserList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 表單狀態
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        agenda: '',
        government_agenda: '',
        discussion_points: '',
        location: '',
        duration_minutes: 60,
        is_online: false,
        time_slots: [{ start: '', end: '' }],
        participants: [] // { user_id, is_mandatory }
    });

    // 載入使用者名單
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const res = await fetchAPI('/users/list');
                if (res.ok) {
                    setUserList(await res.json());
                }
            } catch (error) {
                console.error("無法載入使用者名單:", error);
            }
        };
        loadUsers();
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const addTimeSlot = () => {
        setFormData(prev => ({
            ...prev,
            time_slots: [...prev.time_slots, { start: '', end: '' }]
        }));
    };

    const updateTimeSlot = (index, field, value) => {
        const newSlots = [...formData.time_slots];
        newSlots[index][field] = value;
        setFormData(prev => ({ ...prev, time_slots: newSlots }));
    };

    const removeTimeSlot = (index) => {
        const newSlots = [...formData.time_slots];
        newSlots.splice(index, 1);
        setFormData(prev => ({ ...prev, time_slots: newSlots }));
    };

    const toggleParticipant = (userId) => {
        setFormData(prev => {
            const exists = prev.participants.find(p => p.user_id === userId);
            if (exists) {
                return { ...prev, participants: prev.participants.filter(p => p.user_id !== userId) };
            } else {
                return { ...prev, participants: [...prev.participants, { user_id: userId, is_mandatory: false }] };
            }
        });
    };

    const toggleMandatory = (userId) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.map(p =>
                p.user_id === userId ? { ...p, is_mandatory: !p.is_mandatory } : p
            )
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetchAPI('/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                alert('會議籌備發起成功！');
                navigate('/dashboard');
            } else {
                alert('發起失敗，請檢查資料或稍後再試。');
            }
        } catch (error) {
            console.error(error);
            alert('系統錯誤');
        } finally {
            setSubmitting(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && (!formData.title || !formData.location)) {
            alert("請填寫必填欄位 (會議名稱、地點)");
            return;
        }
        if (step === 2) {
            const validSlots = formData.time_slots.filter(s => s.start && s.end);
            if (validSlots.length === 0) {
                alert("請至少提供一個完整的建議時段");
                return;
            }
            // Filter out empties
            setFormData(prev => ({ ...prev, time_slots: validSlots }));
        }
        setStep(p => Math.min(4, p + 1));
    };

    const prevStep = () => {
        setStep(p => Math.max(1, p - 1));
    };

    const renderStepIndicators = () => {
        const stepsInfo = [
            { icon: FileText, label: '基本資訊' },
            { icon: CalendarIcon, label: '時間調查' },
            { icon: Users, label: '參與者名單' },
            { icon: CheckCircle2, label: '確認發起' }
        ];

        return (
            <div className="flex justify-between items-center mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/10 -z-10 -translate-y-1/2 rounded"></div>
                {stepsInfo.map((s, idx) => {
                    const stepNum = idx + 1;
                    const isActive = step >= stepNum;
                    const isCurrent = step === stepNum;
                    const IconBox = s.icon;
                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 bg-stone-900 px-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-stone-800 text-stone-500 border border-white/10'}`}>
                                <IconBox className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-semibold ${isCurrent ? 'text-amber-400' : isActive ? 'text-stone-300' : 'text-stone-500'}`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- Steps Renderers ---
    const renderStep1 = () => (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-semibold text-amber-500 mb-2">會議名稱 <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., 2026 年度預算審核會議"
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-semibold text-stone-300 mb-2">地點 <span className="text-red-500">*</span></label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="例如：大會議室 A"
                        className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-stone-300 mb-2">時長 (分鐘) <span className="text-red-500">*</span></label>
                    <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} min="15" step="15"
                        className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
                </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <input type="checkbox" id="is_online" name="is_online" checked={formData.is_online} onChange={handleInputChange} className="w-5 h-5 accent-amber-500" />
                <label htmlFor="is_online" className="text-stone-300 font-semibold cursor-pointer">這是一場線上會議 (Online)</label>
            </div>

            <hr className="border-white/5 my-4" />

            <div>
                <label className="block text-sm font-semibold text-stone-300 mb-2">會議主旨</label>
                <textarea name="subject" value={formData.subject} onChange={handleInputChange} rows="2" placeholder="簡述會議目的"
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-semibold text-stone-300 mb-2">議程 (Agenda)</label>
                    <textarea name="agenda" value={formData.agenda} onChange={handleInputChange} rows="3" placeholder="時間表或常規議程"
                        className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-stone-300 mb-2">政府官員議程 (專屬)</label>
                    <textarea name="government_agenda" value={formData.government_agenda} onChange={handleInputChange} rows="3" placeholder="針對政務官的報告或裁示項目"
                        className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold text-stone-300 mb-2">討論重點提示清單</label>
                <textarea name="discussion_points" value={formData.discussion_points} onChange={handleInputChange} rows="3" placeholder="例如：1. 確認A方案預算 2. 檢討B專案時程..."
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-stone-300 text-sm">請提供幾個建議的會議時段，系統會發送調查給與會者。</p>
                <button onClick={addTimeSlot} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-sm font-semibold transition-colors border border-amber-500/30 hover:border-amber-400">
                    <Plus className="w-4 h-4" /> 新增時段
                </button>
            </div>

            <div className="space-y-4">
                {formData.time_slots.map((slot, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10 relative">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center text-xs text-stone-400 font-bold">
                            {index + 1}
                        </div>
                        <div className="flex-1 w-full pl-2">
                            <label className="block text-xs text-stone-500 mb-1 ml-1">開始時間</label>
                            <input type="datetime-local" value={slot.start} onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                                className="w-full p-3 bg-black/20 border border-white/5 rounded-lg text-stone-200 outline-none focus:border-amber-500/50" />
                        </div>
                        <span className="hidden md:block text-stone-500 pt-5">&rarr;</span>
                        <div className="flex-1 w-full">
                            <label className="block text-xs text-stone-500 mb-1 ml-1">結束時間</label>
                            <input type="datetime-local" value={slot.end} onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                                className="w-full p-3 bg-black/20 border border-white/5 rounded-lg text-stone-200 outline-none focus:border-amber-500/50" />
                        </div>
                        {formData.time_slots.length > 1 && (
                            <button onClick={() => removeTimeSlot(index)} className="p-3 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors mt-auto mb-0.5">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => {
        const filteredUsers = userList.filter(u =>
            (u.first_name + u.last_name + u.dept_name + u.title_name).toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-stone-300 mb-2">搜尋人員</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="輸入姓名、單位或職稱搜尋..."
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-stone-200 outline-none focus:border-amber-500 transition-colors" />
                        </div>
                    </div>
                    <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-bold flex flex-col items-center justify-center">
                        <span>已選取</span>
                        <span className="text-xl">{formData.participants.length} 人</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                    {/* 左側：所有人員清單 */}
                    <div className="glass-panel p-2 overflow-y-auto flex flex-col gap-2 rounded-xl">
                        {filteredUsers.length === 0 ? (
                            <p className="text-center text-stone-500 py-4 text-sm">無符合結果</p>
                        ) : (
                            filteredUsers.map(u => {
                                const isSelected = formData.participants.some(p => p.user_id === u.id);
                                return (
                                    <div key={u.id} onClick={() => toggleParticipant(u.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                        <div>
                                            <p className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-stone-200'}`}>{u.last_name}{u.first_name}</p>
                                            <p className="text-xs text-stone-400">{u.dept_name} - {u.title_name}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-stone-500'}`}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* 右側：已選取清單 (含設定必席) */}
                    <div className="glass-panel border-amber-500/20 p-4 overflow-y-auto rounded-xl flex flex-col">
                        <h3 className="text-amber-500 font-semibold mb-3 pb-2 border-b border-white/10 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> 出席名單設定
                        </h3>
                        {formData.participants.length === 0 ? (
                            <p className="text-stone-500 text-sm flex-1 flex justify-center items-center">請從左側選取參與者</p>
                        ) : (
                            <div className="space-y-3">
                                {formData.participants.map(p => {
                                    const userDetails = userList.find(u => u.id === p.user_id);
                                    if (!userDetails) return null;
                                    return (
                                        <div key={p.user_id} className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                                            <div className="flex-1 truncate pr-2">
                                                <p className="font-semibold text-stone-200 truncate">{userDetails.last_name}{userDetails.first_name}</p>
                                                <p className="text-[10px] text-stone-400 truncate">{userDetails.title_name}</p>
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer bg-red-500/10 px-3 py-1.5 rounded-md border border-red-500/20 hover:bg-red-500/20 transition-colors">
                                                <input type="checkbox" checked={p.is_mandatory} onChange={() => toggleMandatory(p.user_id)}
                                                    className="w-4 h-4 accent-red-500 cursor-pointer" />
                                                <span className={`text-xs font-bold ${p.is_mandatory ? 'text-red-400' : 'text-stone-400'}`}>
                                                    必席 (長官)
                                                </span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderStep4 = () => (
        <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" /> 即將發出會議調查
                </h3>

                <div className="space-y-4 text-sm text-stone-300">
                    <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-white/10 pb-4">
                        <span className="text-stone-500 font-semibold">會議名稱</span>
                        <span className="text-stone-100 font-bold text-lg">{formData.title}</span>

                        <span className="text-stone-500 mt-2">地點</span>
                        <span className="mt-2">{formData.location} {formData.is_online ? '(線上)' : ''}</span>

                        <span className="text-stone-500">時長</span>
                        <span>{formData.duration_minutes} 分鐘</span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-white/10 pb-4 pt-2">
                        <span className="text-stone-500">時段數量</span>
                        <span className="text-amber-400 font-bold">{formData.time_slots.length} 個建議時段</span>

                        <span className="text-stone-500">邀請人數</span>
                        <span>共 {formData.participants.length} 人 (其中 {formData.participants.filter(p => p.is_mandatory).length} 位標記為必席)</span>
                    </div>

                    {(formData.subject || formData.agenda || formData.government_agenda) && (
                        <div className="pt-2">
                            <span className="text-stone-500 font-semibold block mb-2">附加內容已填寫：</span>
                            <div className="flex gap-2">
                                {formData.subject && <span className="px-2 py-1 bg-white/10 rounded text-xs">主旨</span>}
                                {formData.agenda && <span className="px-2 py-1 bg-white/10 rounded text-xs">議程</span>}
                                {formData.government_agenda && <span className="px-2 py-1 bg-white/10 rounded text-xs text-red-300">政府官員議程</span>}
                                {formData.discussion_points && <span className="px-2 py-1 bg-white/10 rounded text-xs">重點提示</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-stone-400 text-xs mt-4">
                按下發起會議後，系統將自動寄發通知與時段調查給所有參與者。
            </p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl z-10 relative">
            <Header title="HOAmeet / 發起會議" showUser={true} />

            <div className="glass-panel p-8 mt-6">
                {renderStepIndicators()}

                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-[400px]"
                >
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </motion.div>

                {/* Footer Controls */}
                <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center">
                    <button
                        onClick={step === 1 ? () => navigate('/dashboard') : prevStep}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-all"
                    >
                        {step === 1 ? '取消' : <><ChevronLeft className="w-5 h-5" /> 上一步</>}
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                        >
                            下一步 <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? '處理中...' : '確認並發起會議'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
