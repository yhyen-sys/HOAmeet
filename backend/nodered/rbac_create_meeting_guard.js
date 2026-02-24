// 越權發起會議阻斷邏輯 (用於 Node-RED POST /api/meetings Function 節點)
// 當有人嘗試發起會議時，先檢查其 global_role

let userRole = msg.user.global_role;

if (userRole !== 'super_admin' && userRole !== 'creator') {
    msg.statusCode = 403; // Forbidden
    msg.payload = {
        success: false,
        error: "權限不足！您未被授權發起新會議，請聯繫超級管理者。"
    };
    return [null, msg]; // 阻斷流程
}

// 權限合法，放行至新增會議的 SQL 流程
return [msg, null];
