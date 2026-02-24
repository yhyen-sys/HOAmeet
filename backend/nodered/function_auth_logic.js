/**
 * 節點 C：判斷登入狀態與核發 Token (第 6 個節點)
 */

let dbResult = msg.payload; // 這是 MySQL 節點回傳的陣列結果

if (dbResult.length > 0) {
    // 🟢 情境一：舊朋友 (資料庫有紀錄)
    let user = dbResult[0];

    // 檢查他是否已經填過單位和職稱
    if (user.department_id === null || user.job_title_id === null) {
        // 🟡 有 Email 但沒填妥職稱 (可能上次註冊中斷)
        msg.payload = {
            message: "請補齊單位與職稱資料",
            action: "REQUIRE_INFO",
            email: msg.userData.email
        };
        msg.statusCode = 206; // 206 Partial Content
    } else {
        // 🟢 資料完整，直接發放系統專屬 Token 讓他登入
        // (此處為模擬 Token，實務上請用 JWT 套件簽發)
        let sessionToken = "sys_token_" + new Date().getTime() + "_" + user.id;

        msg.payload = {
            message: "登入成功",
            action: "LOGIN_SUCCESS",
            token: sessionToken,
            user: {
                id: user.id,
                name: user.last_name + user.first_name,
                // role_weight 由 SQL JOIN 取得較佳，此處暫示範邏輯
            }
        };
        msg.statusCode = 200;
    }
} else {
    // 🔵 情境二：新朋友 (資料庫沒紀錄，首次使用 Google 登入)
    msg.payload = {
        message: "歡迎首次登入，請填寫您的單位與職稱",
        action: "REQUIRE_INFO",
        email: msg.userData.email,
        name: msg.userData.name
    };
    msg.statusCode = 206;
}

return msg;
