// 自定義帳號登入邏輯 (供 Node-RED Function 節點使用)
const crypto = require('crypto');

// 接收前端登入資料
const { email, password } = msg.payload;

if (!email || !password) {
    msg.payload = { error: "缺少信箱或密碼" };
    msg.statusCode = 400;
    return [null, msg]; // Node 2: Error Response
}

// 建立相同鹽值雜湊進行比對
const salt = "HOAmeet_Salt_2026";
const current_hash = crypto.createHash('sha256').update(password + salt).digest('hex');

// 準備 SQL 查詢語法
msg.topic = "SELECT id, email, name, global_role, password_hash FROM Users WHERE email = ? LIMIT 1";
msg.payload = [email];

// 保存計算出的 Hash 供下一個節點比對
msg.checkHash = current_hash;

return [msg, null]; // Node 1: To MySQL Query -> Then compare checkHash with password_hash
