const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Update Login Logic
const loginNode = f.find(n => n.id === '15b0f2e403805e65');
if (loginNode) {
    loginNode.func = `/**
 * 節點 C：判斷登入狀態與核發 Token (第 6 個節點)
 */

let dbResult = msg.payload;

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

// 2. Update Admin List SQL
const adminGetNode = f.find(n => n.id === 'admin_prep_get_sql');
if (adminGetNode) {
    adminGetNode.func = `msg.topic = 'SELECT u.id, u.name, u.first_name, u.last_name, u.email, d.dept_name as dept, u.global_role as role, u.global_status FROM Users u LEFT JOIN Departments d ON u.department_id = d.id WHERE u.global_status != "deleted"';\nreturn msg;`;
}

// 3. Status Toggle Logic
const statusPrepNode = {
    "id": "admin_prep_status_sql",
    "type": "function",
    "z": "124419962d0f0420",
    "name": "Prepare PUT Status SQL",
    "func": "let data = msg.payload;\nif (!data.user_id || !data.new_status) {\n    msg.statusCode = 400;\n    msg.payload = { error: 'Missing parameters' };\n    return [null, msg];\n}\nmsg.topic = 'UPDATE Users SET global_status = ? WHERE id = ?';\nmsg.payload = [data.new_status, data.user_id];\nreturn [msg, null];",
    "outputs": 2,
    "wires": [["admin_mysql_node"], ["4c09a6a47d45bff3"]]
};

const statusInNode = {
    "id": "admin_put_status_in",
    "type": "http in",
    "z": "124419962d0f0420",
    "name": "PUT /api/admin/users/status",
    "url": "/api/admin/users/status",
    "method": "put",
    "wires": [["admin_auth_middleware"]]
};

// 4. Update Middleware/Routing to support multiple endpoints
// We'll replace the switch with more robust routing based on URL
const routingNode = f.find(n => n.id === 'admin_routing_switch');
if (routingNode) {
    routingNode.property = "req.url";
    routingNode.rules = [
        { "t": "eq", "v": "/api/admin/users", "vt": "str" },
        { "t": "eq", "v": "/api/admin/users/role", "vt": "str" },
        { "t": "eq", "v": "/api/admin/users/status", "vt": "str" }
    ];
    routingNode.wires = [
        ["admin_prep_get_sql"],
        ["admin_prep_put_sql"],
        ["admin_prep_status_sql"]
    ];
}

f.push(statusPrepNode, statusInNode);

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully updated flows with User Status logic.');
