$flowsPath = 'd:\website\HOAmeet\backend\nodered\flows.json'
if (Test-Path $flowsPath) {
    # 讀取檔案，強制使用 UTF8
    $content = [IO.File]::ReadAllText($flowsPath, [Text.Encoding]::UTF8)
    
    # 1. 修正登入邏輯 (Node id: 15b0f2e403805e65)
    # 替換 Token 產生規則，加入角色資訊以便 Guard 辨識
    $oldLoginToken = 'let sessionToken = \\"sys_token_\\" + new Date().getTime() + \\"_\\" + user.id;'
    $newLoginToken = 'let role = (user.email === \\"yi.kuei.co@gmail.com\\") ? \\"super_admin\\" : (user.global_role || \\"user\\"); let sessionToken = \\"sys_token_\\" + role + \\"_\\" + new Date().getTime() + \\"_\\" + user.id;'
    $content = $content.Replace($oldLoginToken, $newLoginToken)

    # 同步更新回傳的 user 物件
    $oldUserRole = 'global_role: (user.email === \\"yi.kuei.co@gmail.com\\") ? \\"super_admin\\" : (user.global_role || \\"user\\")'
    $newUserRole = 'global_role: role'
    $content = $content.Replace($oldUserRole, $newUserRole)

    # 2. 修正註冊邏輯 (Node id: cfd5d8dcc48ca58f)
    $oldRegToken = "let sessionToken = 'sys_token_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');"
    $newRegToken = "let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');"
    $content = $content.Replace($oldRegToken, $newRegToken)

    # 3. 補回遺失的 Admin API 節點 (Tab ID: 124419962d0f0420)
    $adminNodes = @'
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
'@

    # 合併節點
    $content = $content.Trim()
    if ($content.EndsWith("]")) {
        $contentHead = $content.Substring(0, $content.Length - 1).TrimEnd()
        if (-not $contentHead.EndsWith(",")) { $contentHead += "," }
        $content = $contentHead + "`r`n" + $adminNodes + "`r`n]"
    }

    # 寫回檔案
    [IO.File]::WriteAllText($flowsPath, $content, [Text.Encoding]::UTF8)
    Write-Host "Successfully repaired flows.json and restored admin logic."
}
else {
    Write-Error "flows.json not found."
}
