const fs = require('fs');

const flowsPath = 'd:\\website\\HOAmeet\\backend\\nodered\\flows.json';

const nodesToRestore = [
    {
        "id": "393785d52015c177",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "準備 Google API 請求",
        "func": "/**\n * 節點 A：準備呼叫 Google API (第 2 個節點)\n */\n\n// 取得前端 POST 過來的 token\nlet googleToken = msg.payload.token;\n\nif (!googleToken) {\n    msg.payload = { error: \"缺少 Google Token\" };\n    msg.statusCode = 400;\n    return [null, msg]; // 結束流程並跳到錯誤回應\n}\n\n// 設定 HTTP Request 節點要呼叫的目標網址\nmsg.url = \"https://oauth2.googleapis.com/tokeninfo?id_token=\" + googleToken;\nmsg.method = \"GET\";\n\nreturn [msg, null];",
        "outputs": 2,
        "x": 380, "y": 120,
        "wires": [["5b4ab398b3886f4b", "d365704fa76468e1"], ["4c09a6a47d45bff3"]]
    },
    {
        "id": "a91cf307603cde4c",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "解析結果並準備 MySQL",
        "func": "/**\n * 節點 B：解析 Google 回應並查詢 MySQL (第 4 個節點)\n */\n\n// 解析 Google 回傳的 JSON 資料\nlet googleData = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;\n\n// 檢查 Google 是否回傳錯誤\nif (googleData.error) {\n    msg.payload = { error: \"Google 驗證失敗\", details: googleData.error_description };\n    msg.statusCode = 401;\n    return [null, msg]; \n}\n\n// 提取出安全且經過驗證的 Email 和 姓名\nlet userEmail = googleData.email;\nlet firstName = googleData.given_name || '';\nlet lastName = googleData.family_name || '';\n\n// 將基本資料暫存起來，後面會用到\nmsg.userData = {\n    email: userEmail,\n    first_name: firstName,\n    last_name: lastName\n};\n\n// 組裝 MySQL 查詢指令：檢查此 Email 是否存在我們的 Users 表中\nmsg.topic = \"SELECT * FROM Users WHERE email = ? LIMIT 1\";\nmsg.payload = [userEmail];\n\nreturn [msg, null];",
        "outputs": 2,
        "x": 190, "y": 240,
        "wires": [["8e635957712faec4"], ["4c09a6a47d45bff3", "90c1ba422e906c82"]]
    },
    {
        "id": "15b0f2e403805e65",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "登入邏輯判斷",
        "func": "/**\n * 節點 C：判斷登入狀態與核發 Token (第 6 個節點)\n */\n\nlet dbResult = msg.payload;\n\nif (dbResult.length > 0) {\n    let user = dbResult[0];\n    \n    if (user.department_id === null || user.job_title_id === null) {\n        msg.payload = { \n            message: \"請補齊單位與職稱資料\", \n            action: \"REQUIRE_INFO\",\n            email: msg.userData.email\n        };\n        msg.statusCode = 206;\n    } else {\n        let role = (user.email === \"yi.kuei.co@gmail.com\") ? \"super_admin\" : (user.global_role || \"user\");\n        let sessionToken = \"sys_token_\" + role + \"_\" + new Date().getTime() + \"_\" + user.id; \n        \n        msg.payload = { \n            message: \"登入成功\", \n            action: \"LOGIN_SUCCESS\",\n            token: sessionToken,\n            user: {\n                id: user.id,\n                name: user.last_name + user.first_name,\n                global_role: role,\n                last_name: user.last_name,\n                department_id: user.department_id,\n                job_title_id: user.job_title_id,\n                email: user.email\n            }\n        };\n        msg.statusCode = 200;\n    }\n} else {\n    msg.payload = { \n        message: \"歡迎首次登入，請填寫您的單位與職稱\", \n        action: \"REQUIRE_INFO\",\n        email: msg.userData.email,\n        first_name: msg.userData.first_name,\n        last_name: msg.userData.last_name\n    };\n    msg.statusCode = 206;\n}\n\nreturn msg;",
        "outputs": 1,
        "x": 630, "y": 240,
        "wires": [["4c09a6a47d45bff3", "9b0d50f8678cc4be"]]
    },
    {
        "id": "982bb0a24f90e078",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "準備 INSERT MySQL",
        "func": "let data = msg.payload;\nif (!data.email || !data.first_name || !data.last_name || (!data.department_id && data.department_id !== 0) || (!data.job_title_id && data.job_title_id !== 0)) {\n    msg.payload = { error: '註冊資料不完整', received: data };\n    msg.statusCode = 400;\n    return [null, msg];\n}\nmsg.userData = data;\nmsg.topic = 'INSERT INTO Users (email, first_name, last_name, department_id, job_title_id) VALUES (?, ?, ?, ?, ?)';\nmsg.payload = [data.email, data.first_name, data.last_name, data.department_id, data.job_title_id];\nreturn [msg, null];",
        "outputs": 2,
        "x": 410, "y": 360,
        "wires": [["f595b69a0fd326c3"], ["e42553cb9572c93a", "6a44bcab95cf8e2e"]]
    },
    {
        "id": "cfd5d8dcc48ca58f",
        "type": "function",
        "z": "124419962d0f0420",
        "name": "註冊成功核發 Token",
        "func": "let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');\nmsg.payload = {\n    message: '註冊並登入成功',\n    action: 'LOGIN_SUCCESS',\n    token: sessionToken,\n    user: {\n        name: msg.userData.last_name + msg.userData.first_name,\n        last_name: msg.userData.last_name,\n        department_id: msg.userData.department_id,\n        job_title_id: msg.userData.job_title_id,\n        email: msg.userData.email\n    }\n};\nmsg.statusCode = 200;\nreturn msg;",
        "outputs": 1,
        "x": 850, "y": 360,
        "wires": [["e42553cb9572c93a"]]
    }
];

// Admin API nodes
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
    let flows = JSON.parse(raw);

    const restoreIds = nodesToRestore.map(n => n.id);
    const adminIds = adminNodes.map(n => n.id);
    const allIdsToUpdate = [...restoreIds, ...adminIds];

    // Filter out old versions if they exist
    flows = flows.filter(node => !allIdsToUpdate.includes(node.id));

    // Add new versions
    flows.push(...nodesToRestore);
    flows.push(...adminNodes);

    fs.writeFileSync(flowsPath, JSON.stringify(flows, null, 4), 'utf8');
    console.log("FINAL SUCCESS: flows.json fully restored and RBAC logic injected.");

} catch (err) {
    console.error("ERROR:", err.message);
}
