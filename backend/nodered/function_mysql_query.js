/**
 * 節點 B：解析 Google 回應並查詢 MySQL (第 4 個節點)
 */

// 解析 Google 回傳的 JSON 資料
let googleData = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;

// 檢查 Google 是否回傳錯誤
if (googleData.error) {
    msg.payload = { error: "Google 驗證失敗", details: googleData.error_description };
    msg.statusCode = 401;
    return [null, msg];
}

// 提取出安全且經過驗證的 Email 和 姓名
let userEmail = googleData.email;
let userName = googleData.name;

// 將基本資料暫存起來，後面會用到
msg.userData = {
    email: userEmail,
    name: userName
};

// 組裝 MySQL 查詢指令：檢查此 Email 是否存在我們的 Users 表中
msg.topic = "SELECT * FROM Users WHERE email = ? LIMIT 1";
msg.payload = [userEmail];

return [msg, null];
