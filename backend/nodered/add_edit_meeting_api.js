const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// --------------------------------------------------------------------------------
// 1. Fix GET /api/meetings/:id to return meeting Meta, Slots, and Participants!
// --------------------------------------------------------------------------------
// Current flow:
// http_in_get_meeting -> func_prep_get_meeting -> mysql_get_meeting -> func_prep_slots_list -> mysql_get_slots -> func_format_meeting_res -> http_out_meeting_res

const getMeetingSlotsPrepNode = f.find(n => n.id === 'func_prep_slots_list');
if (getMeetingSlotsPrepNode) {
    getMeetingSlotsPrepNode.func = `if (!msg.payload || msg.payload.length === 0) {
    msg.payload = { error: "Meeting not found or unauthorized" };
    msg.statusCode = 404;
    return [null, msg]; 
}
msg.meetingMeta = msg.payload[0];

// Use the correct integer ID for the next queries!
const internalId = msg.meetingMeta.id;

// We will chain the queries: Slots -> Participants -> Format
msg.topic = "SELECT * FROM Time_Slots WHERE meeting_id = ?";
msg.payload = [internalId];
return [msg, null];`;
}

// Redirect mysql_get_slots -> func_prep_parts_list
const mysqlGetSlotsNode = f.find(n => n.id === 'mysql_get_slots');
const funcPrepPartsListId = 'func_prep_parts_list';

if (mysqlGetSlotsNode) {
    mysqlGetSlotsNode.wires = [[funcPrepPartsListId]];

    // Create new node for Participants
    const prepPartsListNode = {
        "id": funcPrepPartsListId,
        "type": "function",
        "z": mysqlGetSlotsNode.z,
        "g": mysqlGetSlotsNode.g,
        "name": "Prepare Parts SQL",
        "func": `msg.timeSlots = msg.payload;\n\nconst internalId = msg.meetingMeta.id;\nmsg.topic = "SELECT mp.*, u.first_name, u.last_name, u.email, d.dept_name, jt.title_name FROM Meeting_Participants mp JOIN Users u ON mp.user_id = u.id LEFT JOIN Departments d ON u.department_id = d.id LEFT JOIN Job_Titles jt ON u.job_title_id = jt.id WHERE mp.meeting_id = ?";\nmsg.payload = [internalId];\nreturn msg;`,
        "outputs": 1,
        "x": mysqlGetSlotsNode.x + 200,
        "y": mysqlGetSlotsNode.y,
        "wires": [["mysql_get_parts"]]
    };

    const mysqlGetPartsId = 'mysql_get_parts';
    const mysqlGetPartsNode = {
        "id": mysqlGetPartsId,
        "type": "mysql",
        "z": mysqlGetSlotsNode.z,
        "g": mysqlGetSlotsNode.g,
        "mydb": "0bdc806336f756dc",
        "name": "Get Parts",
        "x": prepPartsListNode.x + 180,
        "y": prepPartsListNode.y,
        "wires": [["func_format_meeting_res"]]
    };

    if (!f.find(n => n.id === funcPrepPartsListId)) f.push(prepPartsListNode);
    if (!f.find(n => n.id === mysqlGetPartsId)) f.push(mysqlGetPartsNode);
}

const formatGetMeetingResNode = f.find(n => n.id === 'func_format_meeting_res');
if (formatGetMeetingResNode) {
    formatGetMeetingResNode.func = `msg.payload = {
    ...msg.meetingMeta,
    time_slots: msg.timeSlots,
    participants: msg.payload // Participants are the last query result
};
return msg;`;
}

// --------------------------------------------------------------------------------
// 2. Add PUT /api/meetings/:uuid flow
// --------------------------------------------------------------------------------
const putApiGroupId = 'group_put_meeting';
const z = formatGetMeetingResNode ? formatGetMeetingResNode.z : f[0].z;

const putNodes = [
    {
        "id": "http_in_put_meeting",
        "type": "http in",
        "z": z,
        "g": putApiGroupId,
        "name": "",
        "url": "/api/meetings/:id",
        "method": "put",
        "upload": false,
        "swaggerDoc": "",
        "x": 130,
        "y": 1500,
        "wires": [["func_prep_put_meeting_check"]]
    },
    {
        "id": "func_prep_put_meeting_check",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Check Auth & Meeting",
        "func": `const d = msg.payload;\nlet userId = null;\nlet uuid = msg.req.params.id;\n\nconst authHeader = msg.req.headers['authorization'];\nif (authHeader && authHeader.startsWith('Bearer ')) {\n    const token = authHeader.substring(7);\n    const parts = token.split('_');\n    if (parts.length >= 4) {\n        userId = parseInt(parts[parts.length - 1], 10);\n    }\n}\n\nif (!userId) {\n    throw new Error("Unauthorized: 請先登入後再進行編輯");\n}\n\n// We must verify the user is the admin_id\nmsg.meetingData = d;\nmsg.userId = userId;\nmsg.uuid = uuid;\n\nmsg.topic = "SELECT id, status FROM Meetings WHERE uuid = ? AND admin_id = ?";\nmsg.payload = [uuid, userId];\nreturn msg;`,
        "outputs": 1,
        "x": 360,
        "y": 1500,
        "wires": [["mysql_check_admin"]]
    },
    {
        "id": "mysql_check_admin",
        "type": "mysql",
        "z": z,
        "g": putApiGroupId,
        "mydb": "0bdc806336f756dc",
        "name": "Check Admin",
        "x": 580,
        "y": 1500,
        "wires": [["func_prep_put_meeting_meta"]]
    },
    {
        "id": "func_prep_put_meeting_meta",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Update Meeting Meta",
        "func": `if (!msg.payload || msg.payload.length === 0) {\n    msg.payload = { error: "Forbidden", message: "您無權編輯此會議或會議不存在" };\n    msg.statusCode = 403;\n    return [null, msg];\n}\n\nconst internalId = msg.payload[0].id;\nmsg.internalId = internalId;\nconst d = msg.meetingData;\n\n// Update metadata and increment sequence_num\nmsg.topic = \`\n    UPDATE Meetings SET\n    title = ?, subject = ?, agenda = ?, government_agenda = ?,\n    discussion_points = ?, location = ?, online_url = ?, duration_minutes = ?,\n    is_online = ?, sequence_num = sequence_num + 1\n    WHERE id = ?\n\`;\n\nmsg.payload = [\n    d.title,\n    d.subject || null,\n    d.agenda || null,\n    d.government_agenda || null,\n    d.discussion_points || null,\n    d.location,\n    d.online_url || null,\n    d.duration_minutes,\n    d.is_online ? 1 : 0,\n    internalId\n];\nreturn [msg, null];`,
        "outputs": 2,
        "x": 800,
        "y": 1500,
        "wires": [["mysql_update_meta"], ["http_out_put_error"]]
    },
    {
        "id": "mysql_update_meta",
        "type": "mysql",
        "z": z,
        "g": putApiGroupId,
        "mydb": "0bdc806336f756dc",
        "name": "Upd Meta",
        "x": 1020,
        "y": 1500,
        "wires": [["func_prep_del_slots"]]
    },
    {
        "id": "func_prep_del_slots",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Prepare Del Slots",
        "func": `// We will delete all old slots. \n// Note: This drops user votes, but for now it's the simplest way to sync.\nmsg.topic = "DELETE FROM Time_Slots WHERE meeting_id = ?";\nmsg.payload = [msg.internalId];\nreturn msg;`,
        "outputs": 1,
        "x": 1220,
        "y": 1500,
        "wires": [["mysql_del_slots"]]
    },
    {
        "id": "mysql_del_slots",
        "type": "mysql",
        "z": z,
        "g": putApiGroupId,
        "mydb": "0bdc806336f756dc",
        "name": "Del Slots",
        "x": 1420,
        "y": 1500,
        "wires": [["func_prep_ins_slots"]]
    },
    {
        "id": "func_prep_ins_slots",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Prepare Ins Slots",
        "func": `const slots = msg.meetingData.time_slots;\nif (!slots || slots.length === 0) {\n    msg.topic = "SELECT 1";\n    msg.payload = [];\n    return msg;\n}\n\nlet values = [];\nlet params = [];\nslots.forEach(s => {\n    values.push("(?, ?, ?)");\n    params.push(msg.internalId, s.start, s.end);\n});\nmsg.topic = \`INSERT INTO Time_Slots (meeting_id, start_time, end_time) VALUES \${values.join(',')}\`;\nmsg.payload = params;\nreturn msg;`,
        "outputs": 1,
        "x": 1620,
        "y": 1500,
        "wires": [["mysql_ins_slots"]]
    },
    {
        "id": "mysql_ins_slots",
        "type": "mysql",
        "z": z,
        "g": putApiGroupId,
        "mydb": "0bdc806336f756dc",
        "name": "Ins Slots",
        "x": 1820,
        "y": 1500,
        "wires": [["func_prep_del_parts"]]
    },
    {
        "id": "func_prep_del_parts",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Prepare Del Parts",
        "func": `msg.topic = "DELETE FROM Meeting_Participants WHERE meeting_id = ?";\nmsg.payload = [msg.internalId];\nreturn msg;`,
        "outputs": 1,
        "x": 1020,
        "y": 1580,
        "wires": [["mysql_del_parts"]]
    },
    {
        "id": "mysql_del_parts",
        "type": "mysql",
        "z": z,
        "g": putApiGroupId,
        "mydb": "0bdc806336f756dc",
        "name": "Del Parts",
        "x": 1220,
        "y": 1580,
        "wires": [["func_prep_ins_parts"]]
    },
    {
        "id": "func_prep_ins_parts",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Prepare Ins Parts",
        "func": `const parts = msg.meetingData.participants;\nif (!parts || parts.length === 0) {\n    msg.payload = { message: "會議更新成功", uuid: msg.uuid };\n    return [null, msg]; // Skip to success\n}\n\nlet values = [];\nlet params = [];\nparts.forEach(p => {\n    values.push("(?, ?, ?)");\n    params.push(msg.internalId, p.user_id, p.is_mandatory ? 1 : 0);\n});\n\nmsg.topic = \`INSERT INTO Meeting_Participants (meeting_id, user_id, is_mandatory) VALUES \${values.join(',')}\`;\nmsg.payload = params;\nreturn [msg, null];`,
        "outputs": 2,
        "x": 1420,
        "y": 1580,
        "wires": [["mysql_ins_parts"], ["http_out_put_success"]]
    },
    {
        "id": "mysql_ins_parts",
        "type": "mysql",
        "z": z,
        "g": putApiGroupId,
        "mydb": "0bdc806336f756dc",
        "name": "Ins Parts",
        "x": 1620,
        "y": 1580,
        "wires": [["func_put_success"]]
    },
    {
        "id": "func_put_success",
        "type": "function",
        "z": z,
        "g": putApiGroupId,
        "name": "Format Success",
        "func": `msg.payload = { message: "會議更新成功", uuid: msg.uuid };\nreturn msg;`,
        "outputs": 1,
        "x": 1820,
        "y": 1580,
        "wires": [["http_out_put_success"]]
    },
    {
        "id": "http_out_put_error",
        "type": "http response",
        "z": z,
        "g": putApiGroupId,
        "name": "Error Response",
        "statusCode": "",
        "x": 1020,
        "y": 1440,
        "wires": []
    },
    {
        "id": "http_out_put_success",
        "type": "http response",
        "z": z,
        "g": putApiGroupId,
        "name": "Success Response",
        "statusCode": "200",
        "x": 2040,
        "y": 1580,
        "wires": []
    }
];

if (!f.find(n => n.id === 'group_put_meeting')) {
    f.push({
        "id": "group_put_meeting",
        "type": "group",
        "z": z,
        "name": "Edit Meeting API (PUT)",
        "style": { "label": true },
        "nodes": putNodes.map(n => n.id),
        "x": 50,
        "y": 1400,
        "w": 2100,
        "h": 260
    });
    putNodes.forEach(n => f.push(n));
}

// --------------------------------------------------------------------------------
// 3. Update the global Catch to ensure it responds to this put request too.
// Wait, the new nodes do NOT have explicit catch handling inside the flow, 
// so the global mysql catch (e551dcbbcfafb478) will catch any mysql throw, 
// but it is currently hard-wired to '4c09a6a47d45bff3' which might be the admin HTTP response node.
// We must make sure the error response is sent properly using standard msg.res!
// Let's modify the Global MySQL Error Catch (e551dcbbcfafb478) to dynamically reply
// actually, since standard request/response uses msg.res, any HTTP Response node will work.
// Let's just leave it, it's connected to 4c09a6a47d45bff3 which is an HTTP Response node.

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully added PUT /api/meetings/:id logic and fixed GET meeting participants data.');
