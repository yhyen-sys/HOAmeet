const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

const prepSqlNode = f.find(n => n.id === 'func_prepare_sql');
if (prepSqlNode) {
    prepSqlNode.func = `let userId = null;

// 解析前端傳來的 Token
const authHeader = msg.req.headers['authorization'];
if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parts = token.split('_');
    if (parts.length >= 4) {
        userId = parseInt(parts[parts.length - 1], 10);
    }
}

// 萬一解析失敗，不再退回到 1，而是直接報錯或回空
if (!userId) {
    msg.payload = { error: "Unauthorized", message: "無法識別使用者身分，請重新登入" };
    msg.statusCode = 401;
    return [null, msg]; // 假設有一個 catch 或直接接到 http response
}

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

    // We need to add a second output to this node to handle the unauthorized case,
    // OR we can just throw an error. Throwing is easier because there's already a Catch Errors node.
    prepSqlNode.func = `let userId = null;

// 解析前端傳來的 Token
const authHeader = msg.req.headers['authorization'];
if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parts = token.split('_');
    if (parts.length >= 4) {
        userId = parseInt(parts[parts.length - 1], 10);
    }
}

// 萬一解析失敗，拋出錯誤讓 Catch 節點接手
if (!userId) {
    throw new Error("Unauthorized: 無法識別使用者身分");
}

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

// Fix another one: /api/meetings (POST) - creation
const prepareMeetingNode = f.find(n => n.id === '9cd82291e7e18ec7');
if (prepareMeetingNode) {
    prepareMeetingNode.func = `const d = msg.payload;
let adminId = null;

const authHeader = msg.req.headers['authorization'];
if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parts = token.split('_');
    if (parts.length >= 4) {
        adminId = parseInt(parts[parts.length - 1], 10);
    }
}

if (!adminId) {
    throw new Error("Unauthorized: 無法識別發起人身分");
}

// Generate UUID v4
const meetingUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

msg.meetingData = d;
msg.meetingUuid = meetingUuid;

msg.topic = \`
    INSERT INTO Meetings 
    (uuid, title, subject, agenda, government_agenda, discussion_points, location, online_url, duration_minutes, is_online, status, admin_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'polling', ?)\`;

msg.payload = [
    meetingUuid,
    d.title,
    d.subject || null,
    d.agenda || null,
    d.government_agenda || null,
    d.discussion_points || null,
    d.location,
    d.online_url || null,
    d.duration_minutes,
    d.is_online ? 1 : 0,
    adminId
];
return msg;`;
}

// Fix /api/meetings/:id (GET) - retrieve meeting
const getMeetingNode = f.find(n => n.id === 'func_prep_get_meeting');
if (getMeetingNode) {
    getMeetingNode.func = `let userId = null;
let uuid = msg.req.params.id;

const authHeader = msg.req.headers['authorization'];
if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parts = token.split('_');
    if (parts.length >= 4) {
        userId = parseInt(parts[parts.length - 1], 10);
    }
}

if (!userId) {
    throw new Error("Unauthorized: 請先登入後再存取會議資料");
}

msg.topic = \`
    SELECT m.*, u.first_name AS admin_first_name, u.last_name AS admin_last_name
    FROM Meetings m
    JOIN Users u ON m.admin_id = u.id
    WHERE m.uuid = ? 
    AND (
        m.admin_id = ? 
        OR m.id IN (SELECT meeting_id FROM Meeting_Participants WHERE user_id = ?)
    );
\`;
msg.payload = [uuid, userId, userId];
return msg;`;
}

// Fix /api/user/availability (POST) - submit availability
const prepAvailSqlNode = f.find(n => n.id === 'func_prep_avail_sql');
if (prepAvailSqlNode) {
    prepAvailSqlNode.func = `let userId = null;
const { meeting_uuid, slots } = msg.payload;

const authHeader = msg.req.headers['authorization'];
if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parts = token.split('_');
    if (parts.length >= 4) {
        userId = parseInt(parts[parts.length - 1], 10);
    }
}

if (!userId || !meeting_uuid) {
    throw new Error("Missing parameters or Unauthorized");
}

msg.userId = userId;
msg.slots = slots;

msg.topic = \`
    SELECT id FROM Meetings 
    WHERE uuid = ? 
    AND (
        admin_id = ? 
        OR id IN (SELECT meeting_id FROM Meeting_Participants WHERE user_id = ?)
    );
\`;
msg.payload = [meeting_uuid, userId, userId];
return msg;`;
}

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully updated API nodes to correctly parse User ID from token headers.');
