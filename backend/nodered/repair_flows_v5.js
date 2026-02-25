const fs = require('fs');
const path = require('path');

const flowsPath = 'd:\\website\\HOAmeet\\backend\\nodered\\flows.json';

const loginFunc = `/**
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

return msg;`;

const regFunc = `let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');

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

return msg;`;

const adminNodes = [
    {
        "id": "admin_get_users_in",
        "type": "http in",
        "z": "124419962d0f0420",
        "name": "GET /api/admin/users",
        "url": "/api/admin/users",
        "method": "get",
        "wires": [["admin_auth_middleware"]]
    },
    {
        "id": "admin_put_role_in",
        "type": "http in",
        "z": "124419962d0f0420",
        "name": "PUT /api/admin/users/role",
        "url": "/api/admin/users/role",
        "method": "put",
        "wires": [["admin_auth_middleware"]]
    },
    {
        "id": "admin_auth_middleware",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "Admin Auth Guard",
        "func": "const authHeader = msg.req.headers['authorization'];\nif (authHeader && authHeader.startsWith('Bearer ')) {\n    const token = authHeader.substring(7);\n    if (token.includes('super_admin')) {\n        return [msg, null];\n    }\n}\nmsg.payload = { error: 'Unauthorized', message: '管理權限不足' };\nmsg.statusCode = 403;\nreturn [null, msg];",
        "outputs": 2,
        "wires": [["admin_routing_switch"], ["4c09a6a47d45bff3"]]
    },
    {
        "id": "admin_routing_switch",
        "type": "switch",
        "z": "124419962d0f0420",
        "name": "Route by Method",
        "property": "req.method",
        "propertyType": "msg",
        "rules": [
            { "t": "eq", "v": "GET", "vt": "str" },
            { "t": "eq", "v": "PUT", "vt": "str" }
        ],
        "checkall": "true",
        "repair": false,
        "outputs": 2,
        "wires": [["admin_prep_get_sql"], ["admin_prep_put_sql"]]
    },
    {
        "id": "admin_prep_get_sql",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "Prepare GET Users SQL",
        "func": "msg.topic = 'SELECT u.id, u.name, u.first_name, u.last_name, u.email, d.dept_name as dept, u.global_role as role FROM Users u LEFT JOIN Departments d ON u.department_id = d.id';\nreturn msg;",
        "outputs": 1,
        "wires": [["admin_mysql_node"]]
    },
    {
        "id": "admin_prep_put_sql",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "Prepare PUT Role SQL",
        "func": "let data = msg.payload;\nif (!data.user_id || !data.new_role) {\n    msg.statusCode = 400;\n    msg.payload = { error: 'Missing parameters' };\n    return [null, msg];\n}\nmsg.topic = 'UPDATE Users SET global_role = ? WHERE id = ?';\nmsg.payload = [data.new_role, data.user_id];\nreturn [msg, null];",
        "outputs": 2,
        "wires": [["admin_mysql_node"], ["4c09a6a47d45bff3"]]
    },
    {
        "id": "admin_mysql_node",
        "type": "mysql",
        "z": "124419962d0f0420",
        "mydb": "0bdc806336f756dc",
        "name": "Admin MySQL",
        "wires": [["4c09a6a47d45bff3"]]
    }
];

try {
    const raw = fs.readFileSync(flowsPath, 'utf8');

    // We try to find objects by parsing line-by-line if JSON.parse fails,
    // but first let's try a clever fix: remove the garbage between objects.

    let flows;
    try {
        flows = JSON.parse(raw);
    } catch (e) {
        console.log("JSON is invalid, attempting heuristic recovery...");
        // Match objects by {...}
        // This is tricky if there are nested braces. Node-RED JSON is usually flat array of objects.
        const objects = [];
        const matches = raw.matchAll(/\{(?:[^{}]|\{[^{}]*\})*\}/g);
        for (const match of matches) {
            try {
                const obj = JSON.parse(match[0]);
                if (obj.id) objects.push(obj);
            } catch (innerE) { }
        }
        flows = objects;
    }

    if (!flows || flows.length === 0) {
        throw new Error("Could not recover any nodes from flows.json");
    }

    // 1. Update nodes
    let loginUpdated = false;
    let regUpdated = false;

    flows = flows.map(node => {
        if (node.id === '15b0f2e403805e65') {
            node.func = loginFunc;
            node.name = "登入邏輯判斷";
            loginUpdated = true;
        } else if (node.id === 'cfd5d8dcc48ca58f') {
            node.func = regFunc;
            node.name = "註冊成功核發 Token";
            regUpdated = true;
        }
        return node;
    });

    // 2. Remove existing admin nodes if they are half-broken duplicates
    const adminIds = adminNodes.map(n => n.id);
    flows = flows.filter(node => !adminIds.includes(node.id));

    // 3. Add clean admin nodes
    flows.push(...adminNodes);

    fs.writeFileSync(flowsPath, JSON.stringify(flows, null, 4), 'utf8');
    console.log("SUCCESS: flows.json repaired and updated.");
    console.log(`Login Updated: ${loginUpdated}, Register Updated: ${regUpdated}, Admin Nodes Added: ${adminNodes.length}`);

} catch (err) {
    console.error("CRITICAL ERROR:", err.message);
    process.exit(1);
}
