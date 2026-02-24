// 動態產生 .ics 字串腳本 (用於 Node-RED Function 節點)
// 假設 msg.payload 裡已經包含了會議的詳細資料與動作類型
// meeting 包含: title, start_time, end_time, location, description, uid, sequence
let meeting = msg.payload.meeting;
let action = msg.payload.action; // 'CREATE', 'UPDATE', 'CANCEL'

function formatDateToICS(dateString) {
    let date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

let dtStart = formatDateToICS(meeting.start_time);
let dtEnd = formatDateToICS(meeting.end_time);
let dtStamp = formatDateToICS(new Date());

// 狀態屬性判定
let method = "REQUEST";
let status = "CONFIRMED";

if (action === 'CANCEL') {
    method = "CANCEL";
    status = "CANCELLED";
}

// 組合 .ics 格式字串
let icsContent =
    `BEGIN:VCALENDAR\r\n` +
    `VERSION:2.0\r\n` +
    `PRODID:-//HOAmeetSystem//MeetingScheduler//TW\r\n` +
    `METHOD:${method}\r\n` +
    `BEGIN:VEVENT\r\n` +
    `UID:${meeting.uid}\r\n` +          // 會議唯一碼
    `SEQUENCE:${meeting.sequence}\r\n` + // 版本號 (改期/更新時遞增)
    `DTSTAMP:${dtStamp}\r\n` +
    `DTSTART:${dtStart}\r\n` +
    `DTEND:${dtEnd}\r\n` +
    `SUMMARY:${meeting.title}\r\n` +
    `LOCATION:${meeting.location}\r\n` +
    `DESCRIPTION:${meeting.description}\r\n` +
    `STATUS:${status}\r\n` +
    `END:VEVENT\r\n` +
    `END:VCALENDAR`;

// 轉換為附件格式供 Email 節點寄送
msg.attachments = [
    {
        filename: "invite.ics",
        content: icsContent,
        contentType: "text/calendar; method=" + method + "; charset=UTF-8"
    }
];

// 信件主旨與內文
msg.topic = action === 'CANCEL' ? `【取消通知】${meeting.title}` : `【會議邀請】${meeting.title}`;
let magicBtnHtml = `<br><br><a href="http://localhost:5173/ack.html?uid=${meeting.uid}&user=${msg.user.id}" style="padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">✅ 點此確認收悉</a>`;
msg.payload = `您好，<br><br>會議詳細資訊請參閱附件行事曆。<br>地點：${meeting.location}<br>${magicBtnHtml}<br><br>系統自動發送，請勿直接回覆。`;

return msg;
