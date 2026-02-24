/**
 * 節點 A：準備呼叫 Google API (第 2 個節點)
 */

// 取得前端 POST 過來的 token
let googleToken = msg.payload.token;

if (!googleToken) {
    msg.payload = { error: "缺少 Google Token" };
    msg.statusCode = 400;
    return [null, msg]; // 結束流程並跳到錯誤回應
}

// 設定 HTTP Request 節點要呼叫的目標網址
msg.url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + googleToken;
msg.method = "GET";

return [msg, null];
