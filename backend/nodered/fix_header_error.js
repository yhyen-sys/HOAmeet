const fs = require('fs');
const path = 'd:/website/HOAmeet/backend/nodered/HOAmeet.json';

const f = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Remove redundant Catch nodes or scope them
// "Catch Everything" (b809faec8f6a2872) is dangerous if it overlaps.
// Let's remove it and use specific catches or ensured safe global catches.
const redundantCatchId = 'b809faec8f6a2872';
const indexToRemove = f.findIndex(n => n.id === redundantCatchId);
if (indexToRemove !== -1) {
    f.splice(indexToRemove, 1);
}

// 2. Fix "捕捉 MySQL 錯誤" (e551dcbbcfafb478) to be more specific or ensure it's the only one
const mysqlCatchNode = f.find(n => n.id === 'e551dcbbcfafb478');
if (mysqlCatchNode) {
    mysqlCatchNode.name = "Global MySQL & Flow Catch";
    // Ensure it's not catching things that already have specific catches if possible,
    // but for now, making it the SOLE global catch is simpler.
}

// 3. Fix 3. Prepare Participants (func_prep_participants)
// It needs to handle empty participants and format the final success response.
const prepPartsNode = f.find(n => n.id === 'func_prep_participants');
if (prepPartsNode) {
    prepPartsNode.func = `const meetingId = msg.meetingId;
const parts = msg.meetingData.participants;

// Prepare the final success payload in advance
msg.successPayload = { 
    message: "會議創建成功", 
    id: meetingId,
    uuid: msg.meetingUuid 
};

if (!parts || parts.length === 0) {
    // If no participants, we skip the insert by running a dummy query
    // and setting a flag to indicate we should use the successPayload
    msg.topic = "SELECT 1 AS skip_parts";
    msg.payload = [];
    return msg; 
}

let values = [];
let params = [];
parts.forEach(p => {
    values.push("(?, ?, ?)");
    params.push(meetingId, p.user_id, p.is_mandatory ? 1 : 0);
});

msg.topic = \`INSERT INTO Meeting_Participants (meeting_id, user_id, is_mandatory) VALUES \${values.join(',')}\`;
msg.payload = params;
return msg;`;
}

// 4. Add a Success Formatter node before the final HTTP Response
// The current path is Insert Parts (3b14db09738b0ebc) -> 200 Success (59c2f2284a972dab)
const insertPartsNode = f.find(n => n.id === '3b14db09738b0ebc');
if (insertPartsNode) {
    const formatterId = 'func_meeting_create_final_res';
    const formatterNode = {
        "id": formatterId,
        "type": "function",
        "z": insertPartsNode.z,
        "g": insertPartsNode.g,
        "name": "Format Create Res",
        "func": "msg.payload = msg.successPayload || { message: \"會議創建成功\", uuid: msg.meetingUuid };\nreturn msg;",
        "outputs": 1,
        "x": 1350,
        "y": 1420,
        "wires": [["59c2f2284a972dab"]]
    };

    // Add it if not exists
    if (!f.find(n => n.id === formatterId)) {
        f.push(formatterNode);
    }

    // Re-route wires
    insertPartsNode.wires = [[formatterId]];
}

fs.writeFileSync(path, JSON.stringify(f, null, 4));
console.log('Successfully fixed duplicate catch nodes and improved meeting creation response logic.');
