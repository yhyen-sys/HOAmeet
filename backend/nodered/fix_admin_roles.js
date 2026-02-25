const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Fix Registration Node (cfd5d8dcc48ca58f)
// New users should probably default to 'user' unless they are the admin email
const regNode = f.find(n => n.id === 'cfd5d8dcc48ca58f');
if (regNode) {
    regNode.func = `let userId = msg.payload && msg.payload.insertId ? msg.payload.insertId : Math.floor(Math.random() * 10000);
let email = msg.userData.email;
let role = (email === "yi.kuei.co@gmail.com") ? "super_admin" : "user";
let sessionToken = 'sys_token_' + role + '_' + new Date().getTime() + '_' + userId;

msg.payload = {
    message: '註冊並登入成功',
    action: 'LOGIN_SUCCESS',
    token: sessionToken,
    user: {
        id: userId,
        name: msg.userData.last_name + msg.userData.first_name,
        global_role: role,
        global_status: 'active',
        last_name: msg.userData.last_name,
        department_id: msg.userData.department_id,
        job_title_id: msg.userData.job_title_id,
        email: email
    }
};
msg.statusCode = 200;

return msg;`;
}

// 2. Double check Login Logic Node (15b0f2e403805e65)
// It was mostly correct, but let's ensure it's robust.
const loginNode = f.find(n => n.id === '15b0f2e403805e65');
if (loginNode) {
    loginNode.func = `let dbResult = msg.payload;

if (dbResult.length > 0) {
    let user = dbResult[0];
    
    // 🔴 檢查帳號狀態
    if (user.global_status !== 'active') {
        msg.payload = { 
            error: "Forbidden", 
            message: "您的帳號已被停用或刪除，請洽管理員" 
        };
        msg.statusCode = 403;
        return [null, msg];
    }
    
    if (user.department_id === null || user.job_title_id === null) {
        msg.payload = { 
            message: "請補齊單位與職稱資料", 
            action: "REQUIRE_INFO",
            email: msg.userData.email
        };
        msg.statusCode = 206;
    } else {
        // 確保超級管理員權限
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
                global_status: user.global_status,
                last_name: user.last_name,
                department_id: user.department_id,
                job_title_id: user.job_title_id,
                email: user.email
            }
        };
        msg.statusCode = 200;
    }
} else {
    msg.payload = { 
        message: "歡迎首次登入，請填寫您的單位與職稱", 
        action: "REQUIRE_INFO",
        email: msg.userData.email,
        first_name: msg.userData.first_name,
        last_name: msg.userData.last_name
    };
    msg.statusCode = 206;
}

return msg;`;
}

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully fixed global_role consistency in Login and Registration nodes.');
