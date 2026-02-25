$flowsPath = 'd:\website\HOAmeet\backend\nodered\flows.json'
if (Test-Path $flowsPath) {
    $content = Get-Content $flowsPath -Raw
    $flows = $content | ConvertFrom-Json
    
    $updated = $false

    # 1. Update Login Node (15b0f2e403805e65)
    $loginNode = $flows | Where-Object { $_.id -eq '15b0f2e403805e65' }
    if ($loginNode) {
        $newFunc = @"
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
        let role = (user.email === "yi.kuei.co@gmail.com") ? "super_admin" : (user.global_role || "user");
        let sessionToken = "sys_token_" + role + "_" + new Date().getTime() + "_" + user.id; 
        
        msg.payload = { 
            message: "登入成功", 
            action: "LOGIN_SUCCESS",
            token: sessionToken,
            user: {
                id: user.id,
                name: user.last_name + user.first_name,
                global_role: role,
                last_name: user.last_name,
                department_id: user.department_id,
                job_title_id: user.job_title_id,
                email: user.email
            }
        };
        msg.statusCode = 200;
    }
} else {
    // 🔵 情境二：新朋友 (資料庫沒紀錄)
    msg.payload = { 
        message: "歡迎首次登入，請填寫您的單位與職稱", 
        action: "REQUIRE_INFO",
        email: msg.userData.email,
        first_name: msg.userData.first_name,
        last_name: msg.userData.last_name
    };
    msg.statusCode = 206;
}

return msg;
"@
        $loginNode.func = $newFunc
        $updated = $true
        Write-Host "Updated Login Node logic."
    }

    # 2. Update Register Node (cfd5d8dcc48ca58f)
    $regNode = $flows | Where-Object { $_.id -eq 'cfd5d8dcc48ca58f' }
    if ($regNode) {
        $regFunc = @"
let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');

msg.payload = {
    message: '註冊並登入成功',
    action: 'LOGIN_SUCCESS',
    token: sessionToken,
    user: {
        name: msg.userData.last_name + msg.userData.first_name,
        last_name: msg.userData.last_name,
        department_id: msg.userData.department_id,
        job_title_id: msg.userData.job_title_id,
        email: msg.userData.email
    }
};
msg.statusCode = 200;

return msg;
"@
        $regNode.func = $regFunc
        $updated = $true
        Write-Host "Updated Register Node logic."
    }

    if ($updated) {
        $flows | ConvertTo-Json -Depth 100 | Set-Content $flowsPath -NoNewline
        Write-Host "Saved flows.json successfully."
    }
    else {
        Write-Host "No nodes were found to update."
    }
}
else {
    Write-Error "flows.json not found."
}
