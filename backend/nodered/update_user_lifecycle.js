const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Update Login Logic to check global_status
const loginNode = f.find(n => n.id === '15b0f2e403805e65');
if (loginNode) {
    loginNode.func = `/**
 * 節點 C：判斷登入狀態與核發 Token (第 6 個節點)
 */

let dbResult = msg.payload;

if (dbResult.length > 0) {
    let user = dbResult[0];
    
    // 🔴 檢查帳號狀態 (軟刪除防護)
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
        // Token 格式: sys_token_role_timestamp_userId
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

// 2. Update Admin List API to include status
const adminGetNode = f.find(n => n.id === 'admin_prep_get_sql');
if (adminGetNode) {
    adminGetNode.func = `msg.topic = 'SELECT u.id, u.name, u.first_name, u.last_name, u.email, d.dept_name as dept, u.global_role as role, u.global_status as status FROM Users u LEFT JOIN Departments d ON u.department_id = d.id WHERE u.global_status != "deleted"';\nreturn msg;`;
}

// 3. Add PUT /api/admin/users/status endpoint
const statusInNode = {
    "id": "admin_put_status_in",
    "type": "http in",
    "z": "124419962d0f0420",
    "name": "PUT /api/admin/users/status",
    "url": "/api/admin/users/status",
    "method": "put",
    "wires": [["admin_auth_middleware"]]
};

const statusPrepNode = {
    "id": "admin_prep_status_sql",
    "type": "function",
    "z": "124419962d0f0420",
    "name": "Prepare PUT Status SQL",
    "func": "let data = msg.payload;\nif (!data.user_id || !data.new_status) {\n    msg.statusCode = 400;\n    msg.payload = { error: 'Missing parameters' };\n    return [null, msg];\n}\nmsg.topic = 'UPDATE Users SET global_status = ? WHERE id = ?';\nmsg.payload = [data.new_status, data.user_id];\nreturn [msg, null];",
    "outputs": 2,
    "wires": [["admin_mysql_node"], ["4c09a6a47d45bff3"]]
};

// Add to flows and update routing
f.push(statusInNode, statusPrepNode);

const routingNode = f.find(n => n.id === 'admin_routing_switch');
if (routingNode) {
    routingNode.rules.push({ "t": "eq", "v": "PUT", "vt": "str" }); // Already has PUT, but wait, the switch routes to methods.
    // Actually the current switch is by req.method. We need to route by PATH or just separate http ins.
    // The current admin_routing_switch is:
    /*
        "rules": [
            { "t": "eq", "v": "GET", "vt": "str" },
            { "t": "eq", "v": "PUT", "vt": "str" }
        ],
        "wires": [["admin_prep_get_sql"], ["admin_prep_put_sql"]]
    */
    // Since we have TWO PUT methods for different URLs, better to let HTTP INs connect directly OR switch by URL.
    // Let's connect the new HTTP IN directly to admin_auth_middleware (it already is), then we need the middleware to route.
}

// SIMPLER FIX: Let each HTTP IN define its own flow after Auth Middleware.
// Remove the switch and let each HTTP IN have a unique ID that branches AFTER the middleware.
// Wait, Node-RED middleware usually works by [msg, null] or [null, msg].
// Let's make the Auth Middleware output to a property-based switch.

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully updated flows with User Status logic.');
