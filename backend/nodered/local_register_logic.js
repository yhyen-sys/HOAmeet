// 自定義帳號註冊邏輯 (供 Node-RED Function 節點使用)
// 需搭配 bcryptjs 模組 (於 function 節點 setup 引入或 global context 載入)
// 這裡假設我們在 function 節點內可以直接使用 bcrypt，或者呼叫外部 API
// 為了簡化與相容 Node-RED 預設環境，這裡提供一個輕量級 SHA-256 雜湊方案取代 bcrypt (若未安裝 bcrypt)

const crypto = require('crypto');

// 接收前端註冊資料
const { email, password, name, department_id, job_title } = msg.payload;

if (!email || !password || !name) {
    msg.payload = { error: "缺少必要欄位" };
    msg.statusCode = 400;
    return [null, msg]; // Node 2: Error Response
}

// 建立簡易雜湊 (加鹽以提升安全性，實務上建議用 bcrypt)
const salt = "HOAmeet_Salt_2026";
const password_hash = crypto.createHash('sha256').update(password + salt).digest('hex');

// 準備 SQL 新增語法 (先檢查 Email 是否存在)
msg.topic = `
    INSERT INTO Users (email, password_hash, name, first_name, last_name, department_id, job_title_id, global_role)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user')
`;

// 簡單拆分姓名 (例如 "陳大文" -> first_name="大文", last_name="陳")
const lastName = name.substring(0, 1);
const firstName = name.substring(1) || name;

msg.payload = [
    email,
    password_hash,
    name,
    firstName,
    lastName,
    department_id || null, // 確保數值或 null
    job_title || null
];

// 註冊成功後，將用戶資料往下傳遞給 JWT 核發節點
msg.userProfile = {
    email: email,
    name: name,
    department_id: department_id,
    job_title_id: job_title,
    global_role: 'user'
};

return [msg, null]; // Node 1: To MySQL Insert -> Then JWT Sign
