// 一鍵確認 API 後端邏輯 (用於 Node-RED Function 節點)
// 接收來自 ack.html 的 GET 請求： /api/meeting/acknowledge?m_id=...&u_id=...&token=...

let meetingId = msg.req.query.m_id || msg.req.query.uid;
let userId = msg.req.query.u_id || msg.req.query.user;
let token = msg.req.query.token;

// 1. (選做) 驗證 token 是否合法，防止偽造操作
// 實務上可透過 crypto 確認雜湊是否正確
// if (!isValid(token)) {
//     msg.statusCode = 403;
//     msg.payload = { success: false, error: "Invalid token" };
//     return [null, msg];
// }

// 2. 準備更新資料庫的 SQL 語法
// 這裡將參與者的已讀確認狀態更新為 'acknowledged'
msg.topic = "UPDATE Meeting_Participants SET ack_status = 'acknowledged' WHERE meeting_id = ? AND user_id = ?";
msg.payload = [meetingId, userId];

// 3. 準備回傳給 ack.html 前端的 JSON 回應
// 因為我們已經有獨立的 ack.html，這裡只需回傳 API 結果
msg.res_data = {
    statusCode: 200,
    payload: {
        success: true,
        message: "確認成功！系統已記錄您的狀態。"
    }
};

return msg;
