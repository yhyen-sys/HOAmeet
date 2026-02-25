import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAPI } from '../utils/api';

const getGreeting = (user, depts = [], titles = []) => {
    if (!user || !user.department_id || !user.job_title_id || !user.last_name) return user?.name || "使用者";
    const deptName = depts.find(d => d.id === user.department_id)?.dept_name || "";
    const titleName = titles.find(t => t.id === user.job_title_id)?.title_name || "";
    return `${deptName}${user.last_name}${titleName}`;
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

    // 字典與選擇狀態
    const [departments, setDepartments] = useState([]);
    const [jobTitles, setJobTitles] = useState([]);
    const [selectedDeptType, setSelectedDeptType] = useState('');
    const [dept, setDept] = useState('');
    const [title, setTitle] = useState('');

    // --- 寫死的前端字典資料 (對應 DB id) ---
    const departmentsData = [
        { id: 1, dept_name: '首長室', dept_type: '政府' }, { id: 2, dept_name: '秘書處', dept_type: '政府' }, { id: 3, dept_name: '人事處', dept_type: '政府' }, { id: 4, dept_name: '政風處', dept_type: '政府' }, { id: 5, dept_name: '主計處', dept_type: '政府' }, { id: 6, dept_name: '綜合規劃處', dept_type: '政府' }, { id: 7, dept_name: '民政處', dept_type: '政府' }, { id: 8, dept_name: '財政處', dept_type: '政府' }, { id: 9, dept_name: '建設處', dept_type: '政府' }, { id: 10, dept_name: '教育處', dept_type: '政府' }, { id: 11, dept_name: '農業處', dept_type: '政府' }, { id: 12, dept_name: '地政處', dept_type: '政府' }, { id: 13, dept_name: '社會處', dept_type: '政府' }, { id: 14, dept_name: '勞工處', dept_type: '政府' }, { id: 15, dept_name: '新聞處', dept_type: '政府' }, { id: 16, dept_name: '行政處', dept_type: '政府' }, { id: 17, dept_name: '交通處', dept_type: '政府' }, { id: 18, dept_name: '水利處', dept_type: '政府' }, { id: 19, dept_name: '城鄉發展處', dept_type: '政府' }, { id: 20, dept_name: '文化局', dept_type: '政府' }, { id: 21, dept_name: '消防局', dept_type: '政府' }, { id: 22, dept_name: '衛生局', dept_type: '政府' }, { id: 23, dept_name: '環保局', dept_type: '政府' }, { id: 24, dept_name: '警察局', dept_type: '政府' }, { id: 25, dept_name: '稅務局', dept_type: '政府' }, { id: 26, dept_name: '資訊中心', dept_type: '政府' }, { id: 27, dept_name: '資訊科', dept_type: '政府' }, { id: 28, dept_name: '法制科', dept_type: '政府' }, { id: 29, dept_name: '總務科', dept_type: '政府' }, { id: 30, dept_name: '公關室', dept_type: '政府' }, { id: 31, dept_name: '國會聯絡組', dept_type: '政府' },
        { id: 32, dept_name: '鄉長室', dept_type: '鄉鎮公所' }, { id: 33, dept_name: '鎮長室', dept_type: '鄉鎮公所' }, { id: 34, dept_name: '市長室', dept_type: '鄉鎮公所' }, { id: 35, dept_name: '主任秘書室', dept_type: '鄉鎮公所' }, { id: 36, dept_name: '民政課', dept_type: '鄉鎮公所' }, { id: 37, dept_name: '財政課', dept_type: '鄉鎮公所' }, { id: 38, dept_name: '建設課', dept_type: '鄉鎮公所' }, { id: 39, dept_name: '農建課', dept_type: '鄉鎮公所' }, { id: 40, dept_name: '農業課', dept_type: '鄉鎮公所' }, { id: 41, dept_name: '社會課', dept_type: '鄉鎮公所' }, { id: 42, dept_name: '行政課', dept_type: '鄉鎮公所' }, { id: 43, dept_name: '人事室', dept_type: '鄉鎮公所' }, { id: 44, dept_name: '主計室', dept_type: '鄉鎮公所' }, { id: 45, dept_name: '政風室', dept_type: '鄉鎮公所' }, { id: 46, dept_name: '清潔隊', dept_type: '鄉鎮公所' }, { id: 47, dept_name: '圖書館 (鎮/鄉)', dept_type: '鄉鎮公所' }, { id: 48, dept_name: '托兒所', dept_type: '鄉鎮公所' },
        { id: 49, dept_name: '校長室', dept_type: '學術' }, { id: 50, dept_name: '教務處', dept_type: '學術' }, { id: 51, dept_name: '學務處', dept_type: '學術' }, { id: 52, dept_name: '總務處', dept_type: '學術' }, { id: 53, dept_name: '研發處', dept_type: '學術' }, { id: 54, dept_name: '產學合作處', dept_type: '學術' }, { id: 55, dept_name: '圖書館 (學校)', dept_type: '學術' }, { id: 56, dept_name: '資訊處 (中心)', dept_type: '學術' }, { id: 57, dept_name: '人事室 (學校)', dept_type: '學術' }, { id: 58, dept_name: '會計室 (學校)', dept_type: '學術' }, { id: 59, dept_name: '各學院/系所', dept_type: '學術' },
        { id: 60, dept_name: '理事會 (農漁會)', dept_type: '農漁會' }, { id: 61, dept_name: '監事會 (農漁會)', dept_type: '農漁會' }, { id: 62, dept_name: '總幹事室', dept_type: '農漁會' }, { id: 63, dept_name: '秘書室', dept_type: '農漁會' }, { id: 64, dept_name: '會務部', dept_type: '農漁會' }, { id: 65, dept_name: '信用部', dept_type: '農漁會' }, { id: 66, dept_name: '供銷部', dept_type: '農漁會' }, { id: 67, dept_name: '推廣部', dept_type: '農漁會' }, { id: 68, dept_name: '保險部', dept_type: '農漁會' }, { id: 69, dept_name: '休閒旅遊部', dept_type: '農漁會' }, { id: 70, dept_name: '資訊部 (農漁會)', dept_type: '農漁會' }, { id: 71, dept_name: '企劃稽核部', dept_type: '農漁會' }, { id: 72, dept_name: '農事科', dept_type: '農漁會' }, { id: 73, dept_name: '四健科', dept_type: '農漁會' }, { id: 74, dept_name: '家政科', dept_type: '農漁會' }, { id: 75, dept_name: '收穫處理中心', dept_type: '農漁會' }, { id: 76, dept_name: '農機代耕中心', dept_type: '農漁會' }, { id: 77, dept_name: '超市', dept_type: '農漁會' }, { id: 78, dept_name: '肥料倉庫', dept_type: '農漁會' },
        { id: 79, dept_name: '理事會 (合作社)', dept_type: '合作社' }, { id: 80, dept_name: '監事會 (合作社)', dept_type: '合作社' }, { id: 81, dept_name: '理事主席室', dept_type: '合作社' }, { id: 82, dept_name: '經理室', dept_type: '合作社' }, { id: 83, dept_name: '業務部 (合作社)', dept_type: '合作社' }, { id: 84, dept_name: '財務部 (合作社)', dept_type: '合作社' }, { id: 85, dept_name: '總務部', dept_type: '合作社' }, { id: 86, dept_name: '行銷企劃部', dept_type: '合作社' }, { id: 87, dept_name: '倉儲物流部', dept_type: '合作社' }, { id: 88, dept_name: '加工部', dept_type: '合作社' },
        { id: 89, dept_name: '班長室', dept_type: '產銷班' }, { id: 90, dept_name: '書記 (產銷班)', dept_type: '產銷班' }, { id: 91, dept_name: '會計 (產銷班)', dept_type: '產銷班' }, { id: 92, dept_name: '班員大會', dept_type: '產銷班' }, { id: 93, dept_name: '共同採購組', dept_type: '產銷班' }, { id: 94, dept_name: '共同行銷組', dept_type: '產銷班' }, { id: 95, dept_name: '品質管理組', dept_type: '產銷班' }, { id: 96, dept_name: '財務管理組', dept_type: '產銷班' },
        { id: 97, dept_name: '董事會', dept_type: '企業' }, { id: 98, dept_name: '總經理室 (企業)', dept_type: '企業' }, { id: 99, dept_name: '營運部', dept_type: '企業' }, { id: 100, dept_name: '人資部 (HR)', dept_type: '企業' }, { id: 101, dept_name: '財務部 (企業)', dept_type: '企業' }, { id: 102, dept_name: '法務部', dept_type: '企業' }, { id: 103, dept_name: '資訊部 (IT)', dept_type: '企業' }, { id: 104, dept_name: '研發部 (R&D)', dept_type: '企業' }, { id: 105, dept_name: '行銷部 (企業)', dept_type: '企業' }, { id: 106, dept_name: '業務部 (Sales)', dept_type: '企業' }, { id: 107, dept_name: '客服部', dept_type: '企業' }, { id: 108, dept_name: '生產部', dept_type: '企業' }, { id: 109, dept_name: '品保部 (QA)', dept_type: '企業' }, { id: 110, dept_name: '採購部', dept_type: '企業' }, { id: 111, dept_name: '公關部 (PR)', dept_type: '企業' }, { id: 112, dept_name: '專案管理辦公室 (PMO)', dept_type: '企業' },
        { id: 113, dept_name: '其他', dept_type: '其他' }
    ];

    const jobTitlesData = [
        { id: 1, title_name: '縣長', tier_level: 1, types: ['政府', '鄉鎮公所'] }, { id: 2, title_name: '部長', tier_level: 1, types: ['政府'] }, { id: 3, title_name: '立法委員', tier_level: 1, types: ['政府'] }, { id: 4, title_name: '署長', tier_level: 1, types: ['政府'] }, { id: 5, title_name: '人事長', tier_level: 1, types: ['政府'] },
        { id: 6, title_name: '局長', tier_level: 2, types: ['政府'] }, { id: 7, title_name: '處長', tier_level: 2, types: ['政府'] }, { id: 8, title_name: '代理處長', tier_level: 2, types: ['政府'] }, { id: 9, title_name: '鄉長', tier_level: 2, types: ['鄉鎮公所'] }, { id: 10, title_name: '鎮長', tier_level: 2, types: ['鄉鎮公所'] }, { id: 11, title_name: '市長', tier_level: 2, types: ['鄉鎮公所'] }, { id: 12, title_name: '分署長', tier_level: 2, types: ['政府'] }, { id: 13, title_name: '場長', tier_level: 2, types: ['政府'] }, { id: 14, title_name: '副人事長', tier_level: 2, types: ['政府'] }, { id: 15, title_name: '校長', tier_level: 2, types: ['學術'] }, { id: 16, title_name: '理事長', tier_level: 2, types: ['農漁會', '合作社'] }, { id: 17, title_name: '總幹事', tier_level: 2, types: ['農漁會'] }, { id: 18, title_name: '合作社理事主席', tier_level: 2, types: ['合作社'] }, { id: 19, title_name: '董事長', tier_level: 2, types: ['企業'] }, { id: 20, title_name: '總經理', tier_level: 2, types: ['企業', '農漁會'] }, { id: 21, title_name: '執行長', tier_level: 2, types: ['企業'] }, { id: 22, title_name: '創辦人', tier_level: 2, types: ['企業'] }, { id: 23, title_name: '班長', tier_level: 2, types: ['產銷班'] },
        { id: 24, title_name: '副縣長', tier_level: 3, types: ['政府', '鄉鎮公所'] }, { id: 25, title_name: '秘書長', tier_level: 3, types: ['政府', '鄉鎮公所', '農漁會'] }, { id: 26, title_name: '主任秘書', tier_level: 3, types: ['政府', '鄉鎮公所', '學術'] }, { id: 27, title_name: '主秘', tier_level: 3, types: ['政府', '鄉鎮公所', '學術'] }, { id: 28, title_name: '副處長', tier_level: 3, types: ['政府'] }, { id: 29, title_name: '副署長', tier_level: 3, types: ['政府'] }, { id: 30, title_name: '參事', tier_level: 3, types: ['政府'] }, { id: 31, title_name: '專門委員', tier_level: 3, types: ['政府'] }, { id: 32, title_name: '高級分析師', tier_level: 3, types: ['政府'] }, { id: 33, title_name: '機要秘書', tier_level: 3, types: ['政府', '鄉鎮公所'] }, { id: 34, title_name: '副分署長', tier_level: 3, types: ['政府'] }, { id: 35, title_name: '副場長', tier_level: 3, types: ['政府'] }, { id: 36, title_name: '副執行長', tier_level: 3, types: ['企業'] }, { id: 37, title_name: '農會秘書', tier_level: 3, types: ['農漁會'] }, { id: 38, title_name: '常務監事', tier_level: 3, types: ['農漁會', '合作社'] }, { id: 39, title_name: '合作社監事主席', tier_level: 3, types: ['合作社'] }, { id: 40, title_name: '副總經理', tier_level: 3, types: ['企業'] }, { id: 41, title_name: '副總', tier_level: 3, types: ['企業'] }, { id: 42, title_name: '協理', tier_level: 3, types: ['企業'] }, { id: 43, title_name: '營運長', tier_level: 3, types: ['企業'] }, { id: 44, title_name: '特助', tier_level: 3, types: ['企業'] },
        { id: 45, title_name: '科長', tier_level: 4, types: ['政府'] }, { id: 46, title_name: '課長', tier_level: 4, types: ['鄉鎮公所'] }, { id: 47, title_name: '組長', tier_level: 4, types: ['政府', '學術'] }, { id: 48, title_name: '簡任技正', tier_level: 4, types: ['政府'] }, { id: 49, title_name: '主任', tier_level: 4, types: ['政府', '鄉鎮公所', '學術', '農漁會'] }, { id: 50, title_name: '秘書', tier_level: 4, types: ['政府', '學術', '農漁會'] }, { id: 51, title_name: '視察', tier_level: 4, types: ['政府'] }, { id: 52, title_name: '專員', tier_level: 4, types: ['政府', '企業'] }, { id: 53, title_name: '分析師', tier_level: 4, types: ['政府', '企業'] }, { id: 54, title_name: '設計師', tier_level: 4, types: ['政府', '企業'] }, { id: 55, title_name: '供銷部主任', tier_level: 4, types: ['農漁會'] }, { id: 56, title_name: '推廣部主任', tier_level: 4, types: ['農漁會'] }, { id: 57, title_name: '旅遊部主任', tier_level: 4, types: ['農漁會'] }, { id: 58, title_name: '農漁會理事', tier_level: 4, types: ['農漁會'] }, { id: 59, title_name: '經理', tier_level: 4, types: ['企業', '合作社'] }, { id: 60, title_name: '副理', tier_level: 4, types: ['企業', '合作社'] }, { id: 61, title_name: '廠長', tier_level: 4, types: ['企業', '農漁會'] }, { id: 62, title_name: '專案經理 (PM)', tier_level: 4, types: ['企業'] },
        { id: 63, title_name: '科員', tier_level: 5, types: ['政府'] }, { id: 64, title_name: '課員', tier_level: 5, types: ['鄉鎮公所'] }, { id: 65, title_name: '助理員', tier_level: 5, types: ['政府', '鄉鎮公所'] }, { id: 66, title_name: '助理設計師', tier_level: 5, types: ['政府', '企業'] }, { id: 67, title_name: '辦事員', tier_level: 5, types: ['政府', '鄉鎮公所'] }, { id: 68, title_name: '書記', tier_level: 5, types: ['政府', '鄉鎮公所', '產銷班'] }, { id: 69, title_name: '指導員', tier_level: 5, types: ['農漁會'] }, { id: 70, title_name: '助理幹事', tier_level: 5, types: ['農漁會'] }, { id: 71, title_name: '企業專員', tier_level: 5, types: ['企業'] }, { id: 72, title_name: '助理', tier_level: 5, types: ['政府', '學術', '企業'] }, { id: 73, title_name: '行政秘書', tier_level: 5, types: ['學術', '企業'] }, { id: 74, title_name: '記者', tier_level: 5, types: ['其他'] }, { id: 75, title_name: '一般員工', tier_level: 5, types: ['企業', '其他'] }, { id: 76, title_name: '約聘人員', tier_level: 5, types: ['政府', '鄉鎮公所', '學術'] }, { id: 77, title_name: '會計', tier_level: 5, types: ['產銷班', '合作社', '企業', '學術'] }, { id: 78, title_name: '一般會務人員', tier_level: 5, types: ['農漁會', '合作社'] }, { id: 79, title_name: '班員', tier_level: 5, types: ['產銷班'] }, { id: 80, title_name: '其他', tier_level: 5, types: ['政府', '鄉鎮公所', '學術', '農漁會', '合作社', '產銷班', '企業', '其他'] }
    ];

    // 初始化狀態時直接載入硬寫死的資料
    useEffect(() => {
        setDepartments(departmentsData);
        setJobTitles(jobTitlesData);
    }, []);

    // ---------------- [Google OAuth 流程] ----------------
    // // ---------------- [Google OAuth 流程] ----------------
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
                alert(`歡迎回來，${getGreeting(data.user, departments, jobTitles)}！`);
                navigate('/dashboard');
            } else if (res.status === 206) {
                setTempData({ email: data.email, first_name: data.first_name, last_name: data.last_name });
                setStep(2); // 進入補齊資料
            } else {
                throw new Error("Authentication failed");
            }
        } catch (err) {
            console.error("Google Auth Error:", err);
            alert("Google 驗證失敗：連線或驗證過程發生錯誤。請確認網路狀態或稍後再試。");
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
            alert(`資料建立成功！歡迎加入，${getGreeting(data.user, departments, jobTitles)}！`);
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
                alert(`歡迎回來，${getGreeting(data.user, departments, jobTitles)}！`);
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
                alert(`註冊成功！歡迎加入，${getGreeting(data.user, departments, jobTitles)}！`);
                login(data.token, data.user);
                navigate('/dashboard');
            } else {
                alert(data.error || "註冊失敗，信箱可能已被使用");
            }
        } catch (err) {
            alert("系統錯誤");
        }
    };

    // 取得分類清單
    const deptTypes = [...new Set(departments.map(d => d.dept_type))];
    const filteredDepts = departments.filter(d => d.dept_type === selectedDeptType);


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
                                <select value={selectedDeptType} onChange={e => { setSelectedDeptType(e.target.value); setDept(''); setTitle(''); }}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors">
                                    <option value="" className="bg-stone-800">1. 請選擇體系類別...</option>
                                    {deptTypes.map(t => (
                                        <option key={t} value={t} className="bg-stone-800">{t}</option>
                                    ))}
                                </select>

                                <select value={dept} onChange={e => setDept(e.target.value)} disabled={!selectedDeptType}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors disabled:opacity-50">
                                    <option value="" className="bg-stone-800">2. 請選擇所屬單位...</option>
                                    {filteredDepts.map(d => (
                                        <option key={d.id} value={d.id} className="bg-stone-800">{d.dept_name}</option>
                                    ))}
                                </select>

                                <select value={title} onChange={e => setTitle(e.target.value)} disabled={!dept}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors disabled:opacity-50">
                                    <option value="" className="bg-stone-800">3. 請選擇職稱級別...</option>
                                    {jobTitles
                                        .filter(t => !selectedDeptType || !t.types || t.types.includes(selectedDeptType))
                                        .map(t => (
                                            <option key={t.id} value={t.id} className="bg-stone-800">{t.title_name} (Tier {t.tier_level})</option>
                                        ))}
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

                                <select value={selectedDeptType} onChange={e => { setSelectedDeptType(e.target.value); setDept(''); setTitle(''); }} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-300 outline-none focus:border-amber-500 transition-colors">
                                    <option value="" className="bg-stone-800">1. 請選擇體系類別...</option>
                                    {deptTypes.map(t => (
                                        <option key={t} value={t} className="bg-stone-800">{t}</option>
                                    ))}
                                </select>

                                <select value={dept} onChange={e => setDept(e.target.value)} disabled={!selectedDeptType} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-300 outline-none focus:border-amber-500 transition-colors disabled:opacity-50">
                                    <option value="" className="bg-stone-800">2. 請選擇所屬單位...</option>
                                    {filteredDepts.map(d => (
                                        <option key={d.id} value={d.id} className="bg-stone-800">{d.dept_name}</option>
                                    ))}
                                </select>

                                <select value={title} onChange={e => setTitle(e.target.value)} disabled={!dept} required
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-stone-300 outline-none focus:border-amber-500 transition-colors disabled:opacity-50">
                                    <option value="" className="bg-stone-800">3. 請選擇職稱級別...</option>
                                    {jobTitles
                                        .filter(t => !selectedDeptType || !t.types || t.types.includes(selectedDeptType))
                                        .map(t => (
                                            <option key={t.id} value={t.id} className="bg-stone-800">{t.title_name} (Tier {t.tier_level})</option>
                                        ))}
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
