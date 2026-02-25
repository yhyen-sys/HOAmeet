const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Repair Create Meeting Flow (Insert Participants)
// Find the Insert Slots node
const insertSlotsNode = f.find(n => n.id === '7ae215c1b0cc30c2');
// Create the Prepare Participants function node
const prepPartsId = 'func_prep_participants';
const prepPartsNode = {
    "id": prepPartsId,
    "type": "function",
    "z": insertSlotsNode.z,
    "g": insertSlotsNode.g,
    "name": "3. Prepare Participants",
    "func": "const meetingId = msg.meetingId;\nconst parts = msg.meetingData.participants;\n\nif (!parts || parts.length === 0) {\n    return msg; \n}\n\nlet values = [];\nlet params = [];\nparts.forEach(p => {\n    values.push(\"(?, ?, ?)\");\n    params.push(meetingId, p.user_id, p.is_mandatory ? 1 : 0);\n});\n\nmsg.topic = `INSERT INTO Meeting_Participants (meeting_id, user_id, is_mandatory) VALUES ${values.join(',')}`;\nmsg.payload = params;\nreturn msg;",
    "outputs": 1,
    "x": 1150,
    "y": 1360,
    "wires": [["3b14db09738b0ebc"]]
};

// Check if it already exists, otherwise add it
if (!f.find(n => n.id === prepPartsId)) {
    f.push(prepPartsNode);
}

// Connect Insert Slots to Prepare Participants
if (insertSlotsNode) {
    insertSlotsNode.wires = [[prepPartsId]];
}

// 2. Add Submit Availability API (POST /api/user/availability)
const availNodes = [
    {
        "id": "http_in_post_avail",
        "type": "http in",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "name": "",
        "url": "/api/user/availability",
        "method": "post",
        "upload": false,
        "swaggerDoc": "",
        "x": 140,
        "y": 1800,
        "wires": [["func_prep_avail_sql"]]
    },
    {
        "id": "func_prep_avail_sql",
        "type": "function",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "name": "Prepare Avail SQL",
        "func": "const userId = (msg.req && msg.req.user && msg.req.user.id) ? msg.req.user.id : null;\nconst { meeting_uuid, slots } = msg.payload;\n\nif (!userId || !meeting_uuid) {\n    msg.payload = { error: \"Missing parameters\" };\n    msg.statusCode = 400;\n    return [null, msg];\n}\n\n// We need to:\n// 1. Get meeting_id from uuid and check if user is participant\n// 2. Bulk insert into User_Availability\n\nmsg.userId = userId;\nmsg.slots = slots;\n\nmsg.topic = `\n    SELECT id FROM Meetings \n    WHERE uuid = ? \n    AND (\n        admin_id = ? \n        OR id IN (SELECT meeting_id FROM Meeting_Participants WHERE user_id = ?)\n    );\n`;\nmsg.payload = [meeting_uuid, userId, userId];\nreturn msg;",
        "outputs": 1,
        "x": 380,
        "y": 1800,
        "wires": [["mysql_check_meeting_avail"]]
    },
    {
        "id": "mysql_check_meeting_avail",
        "type": "mysql",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "mydb": "0bdc806336f756dc",
        "name": "Check Meeting & Auth",
        "x": 620,
        "y": 1800,
        "wires": [["func_exec_avail_insert"]]
    },
    {
        "id": "func_exec_avail_insert",
        "type": "function",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "name": "Exec Avail Insert",
        "func": "if (!msg.payload || msg.payload.length === 0) {\n    msg.payload = { error: \"Meeting not found or access denied\" };\n    msg.statusCode = 403;\n    return [null, msg];\n}\n\nconst meetingId = msg.payload[0].id;\nconst userId = msg.userId;\nconst slots = msg.slots;\n\n// We need to resolve start_time/end_time in the request to slot_ids in the DB\n// This usually requires another query OR the frontend sending slot_ids\n// Since Calendar.jsx sends start_time/end_time, we MUST find the slot_ids first.\n\nmsg.meetingId = meetingId;\nmsg.topic = \"SELECT id, start_time, end_time FROM Time_Slots WHERE meeting_id = ?\";\nmsg.payload = [meetingId];\nreturn msg;",
        "outputs": 1,
        "x": 860,
        "y": 1800,
        "wires": [["mysql_get_slots_avail"]]
    },
    {
        "id": "mysql_get_slots_avail",
        "type": "mysql",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "mydb": "0bdc806336f756dc",
        "name": "Get Slot IDs",
        "x": 1060,
        "y": 1800,
        "wires": [["func_final_avail_sql"]]
    },
    {
        "id": "func_final_avail_sql",
        "type": "function",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "name": "Final Avail SQL",
        "func": "const dbSlots = msg.payload;\nconst userSlots = msg.slots;\nconst userId = msg.userId;\n\nlet values = [];\nlet params = [];\n\nuserSlots.forEach(us => {\n    // Match by time (simplified comparison)\n    const match = dbSlots.find(ds => {\n        const dsStart = new Date(ds.start_time).getTime();\n        const usStart = new Date(us.start_time).getTime();\n        return Math.abs(dsStart - usStart) < 60000; // 1 min tolerance\n    });\n    \n    if (match) {\n        values.push(\"(?, ?, 'available')\");\n        params.push(userId, match.id);\n    }\n});\n\nif (values.length === 0) {\n    msg.payload = { error: \"No matching slots found\" };\n    msg.statusCode = 400;\n    return [null, msg];\n}\n\nmsg.topic = `INSERT INTO User_Availability (user_id, slot_id, status) VALUES ${values.join(',')} ON DUPLICATE KEY UPDATE status='available'`;\nmsg.payload = params;\nreturn msg;",
        "outputs": 1,
        "x": 1260,
        "y": 1800,
        "wires": [["mysql_insert_avail"]]
    },
    {
        "id": "mysql_insert_avail",
        "type": "mysql",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "mydb": "0bdc806336f756dc",
        "name": "Insert Avail",
        "x": 1460,
        "y": 1800,
        "wires": [["res_avail_success"]]
    },
    {
        "id": "res_avail_success",
        "type": "http response",
        "z": insertSlotsNode.z,
        "g": "group_availability",
        "name": "Success",
        "statusCode": "200",
        "x": 1640,
        "y": 1800,
        "wires": []
    }
];

// Add group if it's new
if (!f.find(n => n.id === 'group_availability')) {
    f.push({
        "id": "group_availability",
        "type": "group",
        "z": insertSlotsNode.z,
        "name": "Availability API (UUID & ACL)",
        "style": { "label": true },
        "nodes": availNodes.map(n => n.id),
        "x": 50,
        "y": 1740,
        "w": 1700,
        "h": 120
    });
    availNodes.forEach(n => f.push(n));
}

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully repaired Create Meeting flow and added Availability API with UUID/ACL support.');
