const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/flows.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Register Token Logic
const regNode = f.find(n => n.id === 'cfd5d8dcc48ca58f');
if (regNode) {
    regNode.func = `let userId = msg.payload && msg.payload.insertId ? msg.payload.insertId : Math.floor(Math.random() * 10000);
let sessionToken = 'sys_token_creator_' + new Date().getTime() + '_' + userId;

msg.payload = {
    message: '註冊並登入成功',
    action: 'LOGIN_SUCCESS',
    token: sessionToken,
    user: {
        id: userId,
        name: msg.userData.last_name + msg.userData.first_name,
        last_name: msg.userData.last_name,
        department_id: msg.userData.department_id,
        job_title_id: msg.userData.job_title_id,
        email: msg.userData.email
    }
};
msg.statusCode = 200;

return msg;`;
}

// 2. Token Middleware
const midNode = f.find(n => n.id === '928cdce6a21b1368');
if (midNode) {
    midNode.func = `const authHeader = msg.req.headers['authorization'];

if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token.startsWith('sys_token_')) {
        msg.userToken = token;
        const parts = token.split('_');
        const parsedId = parseInt(parts[parts.length - 1], 10);
        msg.req.user = { id: isNaN(parsedId) ? 1 : parsedId };
        return [msg, null];
    }
}

msg.payload = { error: "Unauthorized", message: "尚未登入或 Token 無效" };
msg.statusCode = 401;
return [null, msg];`;
}

// 3. My Meetings SQL
const sqlNode = f.find(n => n.id === 'func_prepare_sql');
if (sqlNode) {
    sqlNode.func = `let userId = (msg.req && msg.req.user && msg.req.user.id) ? msg.req.user.id : 1;

// 撈取與該使用者有相關聯的會議 (發起人 或 受邀人)
msg.topic = \`
    SELECT 
        m.*,
        u.first_name AS admin_first_name,
        u.last_name AS admin_last_name,
        d.dept_name AS admin_dept_name,
        jt.title_name AS admin_title_name
    FROM Meetings m
    JOIN Users u ON m.admin_id = u.id
    LEFT JOIN Departments d ON u.department_id = d.id
    LEFT JOIN Job_Titles jt ON u.job_title_id = jt.id
    WHERE m.admin_id = ? 
       OR m.id IN (SELECT meeting_id FROM Meeting_Participants WHERE user_id = ?)
    ORDER BY m.created_at DESC;
\`;

msg.payload = [userId, userId];
return msg;`;
}

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully updated flows for personalizing My Meetings.');
