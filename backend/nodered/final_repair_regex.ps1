$flowsPath = 'd:\website\HOAmeet\backend\nodered\flows.json'
if (Test-Path $flowsPath) {
    # 讀取檔案，嘗試自動偵測或使用 UTF8
    $content = [IO.File]::ReadAllText($flowsPath, [Text.Encoding]::UTF8)
    
    # 1. 修正登入邏輯 (Node id: 15b0f2e403805e65)
    # 使用正則表達式處理可能的空格 (regex)
    $loginPattern = 'let sessionToken = \\"sys_token_\\" \+ new Date\(\)\.getTime\(\) \+ \\"_\ architecture/api_integration.md" \+ user\.id;\s*'
    $loginReplacement = 'let role = (user.email === \"yi.kuei.co@gmail.com\") ? \"super_admin\" : (user.global_role || \"user\"); let sessionToken = \"sys_token_\" + role + \"_\" + new Date().getTime() + \"_\" + user.id;'
    $content = [regex]::Replace($content, $loginPattern, $loginReplacement)

    # 修正 global_role 賦值 (regex)
    $rolePattern = 'global_role: \(user\.email === \\"yi\.kuei\.co@gmail\.com\\"\) \? \\"super_admin\\" : \(user\.global_role \|\| \\"user\\"\)'
    $roleReplacement = 'global_role: role'
    $content = [regex]::Replace($content, $rolePattern, $roleReplacement)

    # 2. 修正註冊邏輯 (Node id: cfd5d8dcc48ca58f)
    $regPattern = "let sessionToken = 'sys_token_' \+ new Date\(\)\.getTime\(\) \+ '_' \+ Buffer\.from\(msg\.userData\.email\)\.toString\('base64'\);"
    $regReplacement = "let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');"
    $content = [regex]::Replace($content, $regPattern, $regReplacement)

    # 3. 修正亂碼 (常見的 Node-RED 亂碼修復)
    $content = $content.Replace("?入?輯?斷", "登入邏輯判斷")
    $content = $content.Replace("?資?完整", "🟢 資料完整")
    $content = $content.Replace("?情境一", "🟢 情境一")
    $content = $content.Replace("請?齊單位", "請補齊單位")

    [IO.File]::WriteAllText($flowsPath, $content, [Text.Encoding]::UTF8)
    Write-Host "Final repair completed with regex."
}
