-- 智慧熱力圖演算法查詢 (用於 Node-RED MySQL 節點)
-- 變數 ? 會由 Node-RED 帶入目前的 meeting_id，請在 Node-RED 設定 msg.payload = [meeting_id, meeting_id]

SELECT 
    ts.id AS slot_id,
    ts.start_time,
    ts.end_time,
    COUNT(ua.user_id) AS available_count,
    -- 權重計算：優先取客製化權重，若無則取職稱預設權重，再沒有就給 1 分
    SUM(COALESCE(mp.custom_weight, jt.default_weight, 1)) AS total_score,
    
    -- 核心：計算這場會議「總共有幾位」必席長官
    (SELECT COUNT(*) FROM Meeting_Participants WHERE meeting_id = ? AND is_mandatory = TRUE) AS total_mandatory_count,
    
    -- 核心：計算「這個時段」有幾位必席長官能來
    SUM(CASE WHEN mp.is_mandatory = TRUE THEN 1 ELSE 0 END) AS available_mandatory_count

FROM 
    Time_Slots ts
LEFT JOIN 
    User_Availability ua ON ts.id = ua.slot_id AND ua.status = 'available'
LEFT JOIN 
    Meeting_Participants mp ON ua.user_id = mp.user_id AND mp.meeting_id = ts.meeting_id
LEFT JOIN 
    Users u ON mp.user_id = u.id
LEFT JOIN 
    Job_Titles jt ON u.job_title_id = jt.id
WHERE 
    ts.meeting_id = ?
GROUP BY 
    ts.id, ts.start_time, ts.end_time;
