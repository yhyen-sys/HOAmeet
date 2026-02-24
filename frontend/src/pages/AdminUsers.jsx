import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';
import { fetchAPI } from '../utils/api';

export default function AdminUsers() {
    const navigate = useNavigate();
    const { user } = useAuthStore(); // token 已經交由 api.js 處理，這裡不再需要拿出來
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // 模擬從後端取得的所有使用者清單 (實務上應呼叫 GET /api/admin/users)
        setUsers([
            { id: 101, name: "負責人", email: "admin@yourdomain.gov.tw", dept: "幕僚長辦公室", role: "super_admin" },
            { id: 102, name: "林雪柔 專員", email: "lin.sr@gov.tw", dept: "財務部", role: "creator" },
            { id: 103, name: "張智傑 助理", email: "chang.cj@gov.tw", dept: "公共關係室", role: "user" },
            { id: 104, name: "陳大文 組長", email: "chen.tw@gov.tw", dept: "專案小組", role: "creator" }
        ]);
    }, []);

    const toggleRole = async (userId, isChecked) => {
        const newRole = isChecked ? 'creator' : 'user';

        // 樂觀更新 (Optimistic UI)
        const oldUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

        try {
            const res = await fetchAPI(`/admin/users/role`, {
                method: "PUT",
                body: JSON.stringify({ user_id: userId, new_role: newRole })
            });

            if (!res.ok) throw new Error("權限不足或系統錯誤");
            console.log("✅ 權限更新成功");
        } catch (err) {
            console.error("❌ 更新失敗:", err);
            alert("更新失敗！" + err.message);
            // 還原狀態
            setUsers(oldUsers);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.includes(searchTerm) ||
        u.email.includes(searchTerm) ||
        u.dept.includes(searchTerm)
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl z-10 relative">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="font-outfit text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-red-400 flex items-center gap-2">
                        <span>⚙️</span> 系統權限管理
                    </h1>
                    <p className="text-stone-400 mt-1 text-sm">超級管理者模式：管控全域發起會議權限</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold rounded-full tracking-wider">
                        SUPER ADMIN
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-stone-300 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> 返回
                    </button>
                </div>
            </header>

            <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-3 max-w-md flex items-center gap-3">
                <Search className="w-5 h-5 text-stone-400 pl-1" />
                <input
                    type="text"
                    placeholder="搜尋姓名、Email 或 單位..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-white w-full outline-none text-sm placeholder-stone-500"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="p-5 text-stone-400 text-xs font-semibold uppercase tracking-wider">使用者</th>
                                <th className="p-5 text-stone-400 text-xs font-semibold uppercase tracking-wider">單位</th>
                                <th className="p-5 text-stone-400 text-xs font-semibold uppercase tracking-wider">全域角色</th>
                                <th className="p-5 text-stone-400 text-xs font-semibold uppercase tracking-wider text-center">授權發起會議</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => {
                                const isSelf = (user && u.id === user.id) || u.role === 'super_admin';
                                const isChecked = u.role === 'creator' || u.role === 'super_admin';

                                return (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner ${isSelf ? 'bg-red-500' : 'bg-amber-500'}`}>
                                                    {u.name.substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-stone-200 text-sm">{u.name}</span>
                                                    <span className="text-xs text-stone-400">{u.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm text-stone-300">{u.dept}</td>
                                        <td className="p-5">
                                            {u.role === 'super_admin' && <span className="text-amber-400 font-bold text-sm">超級管理者</span>}
                                            {u.role === 'creator' && <span className="text-amber-400 text-sm">授權發起人</span>}
                                            {u.role === 'user' && <span className="text-stone-400 text-sm">一般使用者</span>}
                                        </td>
                                        <td className="p-5 text-center">
                                            {isSelf ? (
                                                <span className="text-xs text-stone-500">(系統預設權限)</span>
                                            ) : (
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isChecked}
                                                        onChange={(e) => toggleRole(u.id, e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:transtone-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                                </label>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-stone-400">找不到符合的使用者</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
