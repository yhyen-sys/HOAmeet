// 超級管理者專用：權限變更 API 邏輯 (用於 Node-RED Function 節點)
// 接收來自超級管理者後台的 PUT 請求： /api/admin/users/role

// 🚨 1. 第一層防範：權限檢驗 (Middleware)
// 假設 msg.user 是從 JWT 解出的當前登入者資訊
let currentUser = msg.user;

if (!currentUser || currentUser.global_role !== 'super_admin') {
    msg.statusCode = 403; // Forbidden
    msg.payload = {
        success: false,
        error: "越權操作！此動作僅限超級管理者執行。"
    };
    // 輸出埠 1 為 SQL，輸出埠 2 為直接回應 (報錯)
    // 請在 Node-RED 設定 2 個 Output，並將 [null, msg] 分別接出
    return [null, msg];
}

// 2. 第二層防範：參數檢查
let targetUserId = msg.payload.user_id; // 目標對象
let newRole = msg.payload.new_role;     // 新角色: 'creator' 或 'user'

if (!targetUserId || !newRole) {
    msg.statusCode = 400; // Bad Request
    msg.payload = { success: false, error: "缺少必要參數 (user_id 或 new_role)" };
    return [null, msg];
}

// 合法角色清單檢查
if (!['creator', 'user', 'super_admin'].includes(newRole)) {
    msg.statusCode = 400;
    msg.payload = { success: false, error: "無效的角色設定" };
    return [null, msg];
}

// 3. 通過檢驗，準備執行資料庫更新
msg.topic = "UPDATE Users SET global_role = ? WHERE id = ?";
msg.payload = [newRole, targetUserId];

// 暫存資訊以便在 MySQL 執行後回報
msg.actionInfo = {
    userId: targetUserId,
    role: newRole
};

return [msg, null];
