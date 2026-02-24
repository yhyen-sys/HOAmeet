// Google 登入後自動識別超級管理者 (用於 Node-RED 登入驗證 Function 節點)
// 假設 googleData 包含從 Google API 驗證回來的用戶資料
let googleData = msg.payload; // 含有 email, name 等資訊
let globalRole = "user"; // 預設身分

// 👑 超級管理者霸王條款：手動指定網頁設計負責人的 Email
const adminEmails = [
    "your.email@gmail.com",
    "director@yourdomain.gov.tw"
];

if (adminEmails.includes(googleData.email)) {
    globalRole = "super_admin";
}

// 在此之後，將 global_role 寫入 JWT 或 Session 中供後續 API 檢驗
msg.user = {
    email: googleData.email,
    name: googleData.name,
    global_role: globalRole
};

return msg;
