const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Update Meeting Creation (POST /api/meetings)
const createNode = f.find(n => n.id === '9cd82291e7e18ec7');
if (createNode) {
    createNode.func = `const d = msg.payload;
let adminId = (msg.req && msg.req.user && msg.req.user.id) ? msg.req.user.id : 1;

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

// 2. Update Meeting Retrieval (GET /api/meetings/:id)
const getNode = f.find(n => n.id === 'func_prep_get_meeting');
if (getNode) {
    getNode.func = `let userId = (msg.req && msg.req.user && msg.req.user.id) ? msg.req.user.id : null;
let uuid = msg.req.params.id;

if (!userId) {
    msg.payload = { error: "Unauthorized", message: "請先登入後再存取會議資料" };
    msg.statusCode = 401;
    return [null, msg]; // Note: This output logic depends on next node, assuming standard branch
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

// 3. Fix Success Response for creation to return UUID
const createResNode = f.find(n => n.id === 'edc1699eeba4d523');
if (createResNode) {
    createResNode.func = `msg.payload = { 
    message: "會議創建成功", 
    id: msg.payload.insertId,
    uuid: msg.meetingUuid 
};
return msg;`;
}

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully updated HOAmeet.json with UUID and Access Control logic.');
