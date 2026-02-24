import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAPI } from '../utils/api';

const mapDept = (id) => {
    switch (id) {
        case 1: return "政府機關";
        case 2: return "學術單位";
        case 3: return "外部專家";
        default: return "";
    }
};

const mapTitle = (id) => {
    switch (id) {
        case 1: return "長官";
        case 2: return "科長";
        case 3: return "專員";
        default: return "";
    }
};

const getGreeting = (user) => {
    if (!user || !user.department_id || !user.job_title_id || !user.last_name) return user?.name || "使用者";
    return `${mapDept(user.department_id)}${user.last_name}${mapTitle(user.job_title_id)}`;
};

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    // 1: 選擇登入方式, 2: 補齊 Google 資料, 3: 一般帳號註冊
    const [step, setStep] = useState(1);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

    // 表單狀態
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [tempData, setTempData] = useState({ email: '', name: '' }); // For Google step 2
    const [name, setName] = useState('');
    const [dept, setDept] = useState('');
    const [title, setTitle] = useState('');

    // ---------------- [Google OAuth 流程] ----------------
    useEffect(() => {
        if (step === 1 && window.google) {
            window.google.accounts.id.initialize({
                client_id: "489447090570-rq20a1shsvs57mairm65r9rin21a8o8s.apps.googleusercontent.com", // TODO: 需替換為真實 ID
                callback: handleGoogleLogin
            });
            window.google.accounts.id.renderButton(
                document.getElementById("google-button-container"),
                { theme: "filled_blue", size: "large", width: "100%" }
            );
        }
    }, [step]);

    const handleGoogleLogin = async (response) => {
        const googleToken = response.credential;
        try {
            const res = await fetchAPI(`/auth/google`, {
                method: "POST",
                body: JSON.stringify({ token: googleToken })
            });

            const data = await res.json();

            if (res.status === 200) {
                login(data.token, data.user);
                alert(`歡迎回來，${getGreeting(data.user)}！`);
                navigate('/dashboard');
            } else if (res.status === 206) {
                setTempData({ email: data.email, first_name: data.first_name, last_name: data.last_name });
                setStep(2); // 進入補齊資料
            } else {
                throw new Error("Authentication failed");
            }
        } catch (err) {
            console.error(err);
            alert("Google 驗證失敗，請檢查網路或確認後端服務是否運行中。");
        }
    };

    const submitGoogleExtraInfo = async () => {
        if (!dept || !title) return alert("請完整填寫單位與職稱");
        try {
            const res = await fetchAPI(`/auth/register`, {
                method: "POST",
                body: JSON.stringify({
                    email: tempData.email,
                    first_name: tempData.first_name,
                    last_name: tempData.last_name,
                    department_id: parseInt(dept, 10),
                    job_title_id: parseInt(title, 10)
                })
            });
            const data = await res.json();
            alert(`資料建立成功！歡迎加入，${getGreeting(data.user)}！`);
            login(data.token, data.user);
            navigate('/dashboard');
        } catch (err) {
            alert("註冊失敗");
        }
    };

    // ---------------- [一般帳密 流程] ----------------
    const handleLocalLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return alert("請輸入信箱與密碼");

        try {
            const res = await fetchAPI(`/auth/login-local`, {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`歡迎回來，${getGreeting(data.user)}！`);
                login(data.token, data.user);
                navigate('/dashboard');
            } else {
                alert(data.error || "登入失敗，帳號或密碼錯誤");
            }
        } catch (err) {
            alert("系統錯誤");
        }
    };

    const handleLocalRegister = async (e) => {
        e.preventDefault();
        if (!email || !password || !name || !dept || !title) return alert("請完整填寫所有欄位");

        try {
            const res = await fetchAPI(`/auth/register-local`, {
                method: "POST",
                body: JSON.stringify({ email, password, name, department_id: parseInt(dept, 10), job_title_id: parseInt(title, 10) })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`註冊成功！歡迎加入，${getGreeting(data.user)}！`);
                login(data.token, data.user);
                navigate('/dashboard');
            } else {
                alert(data.error || "註冊失敗，信箱可能已被使用");
            }
        } catch (err) {
            alert("系統錯誤");
        }
    };


    return (
        <div className="flex items-center justify-center min-h-screen p-4 z-10 relative">
            <div className="w-full max-w-md">

                <AnimatePresence mode="wait">
                    {/* ================= STEP 1: 主畫面 (登入或選擇註冊) ================= */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass-panel p-8"
                        >
                            <div className="text-center mb-8">
                                <h1 className="font-outfit text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-600 mb-2">
                                    HOAmeet
                                </h1>
                                <p className="text-stone-400 text-sm">智慧會議排程與媒合平台</p>
                            </div>

                            {/* Tab Switcher */}
                            <div className="flex p-1 mb-8 bg-black/20 rounded-xl backdrop-blur-sm border border-white/5">
                                <button
                                    onClick={() => setAuthMode('login')}
                                    className={`flex - 1 py - 2 text - sm font - semibold rounded - lg transition - all ${authMode === 'login' ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30' : 'text-stone-500 hover:text-stone-300'} `}
                                >
                                    登入
                                </button>
                                <button
                                    onClick={() => setAuthMode('register')}
                                    className={`flex - 1 py - 2 text - sm font - semibold rounded - lg transition - all ${authMode === 'register' ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30' : 'text-stone-500 hover:text-stone-300'} `}
                                >
                                    註冊新帳號
                                </button>
                            </div>

                            {authMode === 'login' ? (
                                // --- 登入表單 ---
                                <form onSubmit={handleLocalLogin} className="space-y-4">
                                    <div>
                                        <input type="email" placeholder="電子郵件" value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" />
                                    </div>
                                    <div>
                                        <input type="password" placeholder="密碼" value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" />
                                    </div>
                                    <button type="submit" className="w-full p-3.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20">
                                        登入系統
                                    </button>

                                    <div className="relative flex py-5 items-center">
                                        <div className="flex-grow border-t border-white/10"></div>
                                        <span className="flex-shrink-0 mx-4 text-stone-500 text-xs">或使用第三方帳號</span>
                                        <div className="flex-grow border-t border-white/10"></div>
                                    </div>

                                    <div id="google-button-container" className="flex justify-center h-[40px] overflow-hidden rounded-xl"></div>
                                </form>
                            ) : (
                                // --- 註冊引導 ---
                                <div className="space-y-6">
                                    <p className="text-center text-stone-400 text-sm">
                                        推薦使用 Google 帳號快速註冊，系統將自動為您綁定信箱。
                                    </p>
                                    <div id="google-button-container" className="flex justify-center h-[40px] overflow-hidden rounded-xl"></div>

                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-white/10"></div>
                                        <span className="flex-shrink-0 mx-4 text-stone-500 text-xs">或</span>
                                        <div className="flex-grow border-t border-white/10"></div>
                                    </div>

                                    <button
                                        onClick={() => setStep(3)}
                                        className="w-full p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 text-white font-semibold rounded-xl transition-all"
                                    >
                                        使用 Email 註冊
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ================= STEP 2: Google 補齊資料 ================= */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-panel p-8"
                        >
                            <h2 className="text-2xl font-bold mb-2 text-center text-white">完善基本資料</h2>
                            <p className="text-stone-400 text-sm text-center mb-6">Google 驗證成功，請補充您的身分以利權重計算</p>

                            <div className="mb-6 bg-white/5 rounded-lg p-3 border border-white/5">
                                <p className="text-xs text-stone-400 mb-1">綁定帳號</p>
                                <p className="text-sm text-white font-semibold">{tempData.email}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <select value={dept} onChange={e => setDept(e.target.value)}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors">
                                    <option value="" className="bg-stone-800">請選擇單位類型...</option>
                                    <option value="1" className="bg-stone-800">政府機關 (Government)</option>
                                    <option value="2" className="bg-stone-800">學術單位 (Academic)</option>
                                    <option value="3" className="bg-stone-800">外部/專家 (External)</option>
                                </select>

                                <select value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors">
                                    <option value="" className="bg-stone-800">請選擇職稱級別...</option>
                                    <option value="1" className="bg-stone-800">局處首長 / 長官 (權重 5)</option>
                                    <option value="2" className="bg-stone-800">單位主管 / 科長 (權重 3)</option>
                                    <option value="3" className="bg-stone-800">基層承辦 / 專員 (權重 1)</option>
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 p-3.5 bg-white/5 hover:bg-white/10 text-stone-300 rounded-xl transition-all">
                                    取消
                                </button>
                                <button onClick={submitGoogleExtraInfo} className="flex-1 p-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all">
                                    完成註冊
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ================= STEP 3: 一般表單註冊 ================= */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-panel p-8 max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <h2 className="text-2xl font-bold mb-2 text-center text-white">建立新帳號</h2>
                            <p className="text-stone-400 text-sm text-center mb-6">填寫以下資料完成註冊</p>

                            <form onSubmit={handleLocalRegister} className="space-y-4 mb-8">
                                <input type="email" placeholder="電子郵件" value={email} onChange={e => setEmail(e.target.value)} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" />

                                <input type="password" placeholder="密碼 (至少 6 字元)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" />

                                <input type="text" placeholder="真實姓名" value={name} onChange={e => setName(e.target.value)} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" />

                                <select value={dept} onChange={e => setDept(e.target.value)} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-300 outline-none focus:border-amber-500 transition-colors">
                                    <option value="" className="bg-stone-800">請選擇單位類型...</option>
                                    <option value="1" className="bg-stone-800">政府機關 (Government)</option>
                                    <option value="2" className="bg-stone-800">學術單位 (Academic)</option>
                                    <option value="3" className="bg-stone-800">外部/專家 (External)</option>
                                </select>

                                <select value={title} onChange={e => setTitle(e.target.value)} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-300 outline-none focus:border-amber-500 transition-colors">
                                    <option value="" className="bg-stone-800">請選擇職稱級別...</option>
                                    <option value="1" className="bg-stone-800">局處首長 / 長官 (權重 5)</option>
                                    <option value="2" className="bg-stone-800">單位主管 / 科長 (權重 3)</option>
                                    <option value="3" className="bg-stone-800">基層承辦 / 專員 (權重 1)</option>
                                </select>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setStep(1)} className="flex-1 p-3.5 bg-white/5 hover:bg-white/10 text-stone-300 rounded-xl transition-all">
                                        返回
                                    </button>
                                    <button type="submit" className="flex-1 p-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all">
                                        註冊並登入
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
