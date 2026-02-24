// 智慧熱力圖排名與標記邏輯 (用於 Node-RED Function 節點)
// 假設 msg.payload 是 MySQL 回傳的陣列結果
let slots = msg.payload;

// 1. 處理「必席長官」的一票否決權邏輯
slots.forEach(slot => {
    // 預防資料庫回傳 null
    slot.total_score = slot.total_score || 0;

    // 檢查是否有必席長官缺席
    if (slot.total_mandatory_count > slot.available_mandatory_count) {
        // 有必席長官不能來！
        slot.is_vetoed = true; // 標記為被否決
        slot.warning_msg = "⚠️ 核心長官無法出席";
        // 為了不讓系統推薦這個時段，我們把它的推薦分數歸零 (但不影響實際顯示的分數)
        slot.rank_score = 0;
    } else {
        slot.is_vetoed = false;
        slot.rank_score = slot.total_score;
    }
});

// 2. 找出 Top 3 熱門時段 (根據 rank_score 排序)
// 複製一份陣列來排序，由大到小
let sortedSlots = [...slots].sort((a, b) => b.rank_score - a.rank_score);

// 取出前 3 名的分數門檻 (只要分數大於等於第 3 名的分數，且大於 0，就是 Top 3)
let top3Threshold = sortedSlots.length > 2 ? sortedSlots[2].rank_score : 0;

// 3. 標記 🔥 Top 3 屬性，整理成前端需要的乾淨格式
let finalHeatmapData = slots.map(slot => {
    let isTop = (!slot.is_vetoed && slot.rank_score >= top3Threshold && slot.rank_score > 0);

    return {
        slot_id: slot.slot_id,
        start: slot.start_time,
        end: slot.end_time,
        score: slot.total_score,
        headcount: slot.available_count,
        isTop: isTop, // 前端依據這個布林值畫出 🔥 火焰標籤
        isVetoed: slot.is_vetoed,
        warning: slot.warning_msg || ""
    };
});

// 回傳給前端
msg.payload = finalHeatmapData;
return msg;
