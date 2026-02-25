$flowsPath = 'd:\website\HOAmeet\backend\nodered\flows.json'
$nodesPath = 'd:\website\HOAmeet\backend\nodered\rbac_nodes_v2.json'

if (Test-Path $flowsPath) {
    $content = Get-Content $flowsPath -Raw
    
    # 1. Update Login Logic Token
    $oldLoginToken = 'let sessionToken = \\\"sys_token_\\\" + new Date().getTime() + \\\"_\\\" + user.id;'
    $newLoginToken = 'let role = (user.email === \\\"yi.kuei.co@gmail.com\\\") ? \\\"super_admin\\\" : (user.global_role || \\\"user\\\"); let sessionToken = \\\"sys_token_\\\" + role + \\\"_\\\" + new Date().getTime() + \\\"_\\\" + user.id;'
    $content = $content.Replace($oldLoginToken, $newLoginToken)

    # 2. Update Registration Token
    $oldRegToken = "let sessionToken = 'sys_token_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');"
    $newRegToken = "let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + Buffer.from(msg.userData.email).toString('base64');"
    $content = $content.Replace($oldRegToken, $newRegToken)

    # 3. Merge Admin Nodes
    if (Test-Path $nodesPath) {
        $nodes = Get-Content $nodesPath -Raw
        $nodesBody = $nodes.Trim().TrimStart('[').TrimEnd(']')
        
        $content = $content.Trim()
        if ($content.EndsWith(']')) {
            $contentHead = $content.Substring(0, $content.Length - 1).TrimEnd()
            if (-not $contentHead.EndsWith(',')) {
                $contentHead += ","
            }
            $content = $contentHead + "`r`n" + $nodesBody + "`r`n]"
        }
    }

    $content | Set-Content $flowsPath -NoNewline
    Write-Host "Successfully restored RBAC nodes and updated token logic."
}
else {
    Write-Error "flows.json not found."
}
