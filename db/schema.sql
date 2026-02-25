-- HOAmeet Database Schema
-- Last updated: 2026-02-24

-- 1. 建立字典表 (單位與職稱)
-- 單位字典表
CREATE TABLE IF NOT EXISTS Departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    dept_type ENUM('政府', '鄉鎮公所', '學術', '農漁會', '合作社', '產銷班', '企業', '其他') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 職稱與權重字典表 (核心積分依據)
CREATE TABLE IF NOT EXISTS Job_Titles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title_name VARCHAR(100) NOT NULL,
    tier_level INT DEFAULT 5 COMMENT '職稱階層 (Tier 1-5)',
    default_weight INT DEFAULT 1 COMMENT '預設權重積分(例如長官為5, 承辦為1)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 建立使用者表 (支援 Google 登入)
-- 使用者主表
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL, -- 一般註冊密碼雜湊，Google 登入者可為 NULL
    first_name VARCHAR(50) NULL,
    last_name VARCHAR(50) NULL,
    department_id INT NULL,          -- 允許為空 (因 Google 首次登入時還沒填)
    job_title_id INT NULL,           -- 允許為空 (因 Google 首次登入時還沒填)
    auth_provider VARCHAR(20) DEFAULT 'email' COMMENT '登入方式: email, google',
    global_status ENUM('active', 'inactive', 'deleted') DEFAULT 'active' COMMENT '帳號狀態',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES Departments(id),
    FOREIGN KEY (job_title_id) REFERENCES Job_Titles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 建立會議與時段主表 (包含黑名單與狀態)
-- 會議主表
CREATE TABLE IF NOT EXISTS Meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL COMMENT '不可預測的會議唯一識別碼',
    title VARCHAR(200) NOT NULL,
    subject TEXT NULL COMMENT '會議主旨',
    agenda TEXT NULL COMMENT '議程',
    government_agenda TEXT NULL COMMENT '議程',
    discussion_points TEXT NULL COMMENT '討論重點提示清單',
    duration_minutes INT NOT NULL COMMENT '會議時數(分鐘)',
    location VARCHAR(200) NOT NULL,
    online_url VARCHAR(500) NULL COMMENT '線上參與網址',
    is_online BOOLEAN DEFAULT FALSE COMMENT '是否開放線上參與',
    blocked_dates JSON NULL COMMENT '管理者排除的日期(陣列格式["2024-10-10"])',
    status ENUM('draft', 'polling', 'confirmed', 'canceled') DEFAULT 'draft' COMMENT '會議狀態',
    admin_id INT NOT NULL COMMENT '建立此會議的管理者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES Users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 會議提供的所有可用時段表 (熱力圖的基礎)
CREATE TABLE IF NOT EXISTS Time_Slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    current_headcount INT DEFAULT 0 COMMENT '快取：目前填寫有空的人數',
    current_total_score INT DEFAULT 0 COMMENT '快取：目前累積的權重總積分',
    is_final_selected BOOLEAN DEFAULT FALSE COMMENT '管理者最終是否拍板此時段',
    FOREIGN KEY (meeting_id) REFERENCES Meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 建立參與者與時間勾選表 (媒合邏輯核心)
-- 會議參與者名單 (可設定必席與客製化權重)
CREATE TABLE IF NOT EXISTS Meeting_Participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE COMMENT '是否為必須出席的長官',
    custom_weight INT NULL COMMENT '若填寫，則覆蓋職稱預設權重',
    FOREIGN KEY (meeting_id) REFERENCES Meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    UNIQUE KEY unique_invite (meeting_id, user_id) -- 確保同一場會議不會重複邀請同一人
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 使用者勾選時間紀錄表
CREATE TABLE IF NOT EXISTS User_Availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    status ENUM('available', 'unavailable') DEFAULT 'available',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (slot_id) REFERENCES Time_Slots(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (user_id, slot_id) -- 防止同一個人對同一個時段重複送出
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 擴充：會議生命週期管理與已讀追蹤機制 (Read Receipts)
-- 替參與者名單表新增確認狀態，用來追蹤誰還沒點擊「確認收悉」按鈕
ALTER TABLE Meeting_Participants 
ADD COLUMN ack_status ENUM('pending', 'acknowledged') DEFAULT 'pending' 
COMMENT '變動確認狀態：pending(未讀/未確認), acknowledged(已確認)';

-- 在會議表新增版本號，處理 .ics 行事曆與自動覆寫/取消更新
ALTER TABLE Meetings
ADD COLUMN sequence_num INT DEFAULT 0 
COMMENT '會議版本號：每次改期加1，用於更新使用者的 Google 行事曆';

-- 6. 全體權限分層機制 (RBAC)
-- 在 Users 表新增 global_role 欄位，定義全域權限
ALTER TABLE Users 
ADD COLUMN global_role ENUM('super_admin', 'creator', 'user') DEFAULT 'user' 
COMMENT '全域角色: super_admin(最高權限), creator(可發起會議), user(僅能參與)';

-- 將特定使用者設為超級管理員 (範例：將 ID 為 2 的使用者升級)
-- UPDATE Users SET global_role = 'super_admin' WHERE id = 2;

-- 7. 初始字典資料 (Seeding)
-- 單位字典庫
-- 執行前先清空確保重啟ID
TRUNCATE TABLE Departments;

INSERT INTO Departments (dept_name, dept_type) VALUES
-- 政府機關 (包含中央與縣市政府)
('首長室', '政府'), ('秘書處', '政府'), ('人事處', '政府'), ('政風處', '政府'), 
('主計處', '政府'), ('綜合規劃處', '政府'), ('民政處', '政府'), ('財政處', '政府'), 
('建設處', '政府'), ('教育處', '政府'), ('農業處', '政府'), ('地政處', '政府'), 
('社會處', '政府'), ('勞工處', '政府'), ('新聞處', '政府'), ('行政處', '政府'), 
('交通處', '政府'), ('水利處', '政府'), ('城鄉發展處', '政府'), ('文化局', '政府'), 
('消防局', '政府'), ('衛生局', '政府'), ('環保局', '政府'), ('警察局', '政府'), 
('稅務局', '政府'), ('資訊中心', '政府'),

-- 中央機關常見單位
('資訊科', '政府'), ('法制科', '政府'), ('總務科', '政府'), ('公關室', '政府'), ('國會聯絡組', '政府'),

-- 鄉鎮公所
('鄉長室', '鄉鎮公所'), ('鎮長室', '鄉鎮公所'), ('市長室', '鄉鎮公所'), ('主任秘書室', '鄉鎮公所'), 
('民政課', '鄉鎮公所'), ('財政課', '鄉鎮公所'), ('建設課', '鄉鎮公所'), ('農建課', '鄉鎮公所'), 
('農業課', '鄉鎮公所'), ('社會課', '鄉鎮公所'), ('行政課', '鄉鎮公所'), ('人事室', '鄉鎮公所'), 
('主計室', '鄉鎮公所'), ('政風室', '鄉鎮公所'), ('清潔隊', '鄉鎮公所'), ('圖書館', '鄉鎮公所'), 
('托兒所', '鄉鎮公所'),

-- 學術機關
('校長室', '學術'), ('教務處', '學術'), ('學務處', '學術'), ('總務處', '學術'), 
('研發處', '學術'), ('產學合作處', '學術'), ('圖書館', '學術'), ('資訊處 (中心)', '學術'), 
('人事室', '學術'), ('會計室', '學術'), ('各學院/系所', '學術'),

-- 農漁會
('理事會', '農漁會'), ('監事會', '農漁會'), ('總幹事室', '農漁會'), ('秘書室', '農漁會'), 
('會務部', '農漁會'), ('信用部', '農漁會'), ('供銷部', '農漁會'), ('推廣部', '農漁會'), 
('保險部', '農漁會'), ('休閒旅遊部', '農漁會'), ('資訊部', '農漁會'), ('企劃稽核部', '農漁會'), 
('農事科', '農漁會'), ('四健科', '農漁會'), ('家政科', '農漁會'), ('收穫處理中心', '農漁會'), 
('農機代耕中心', '農漁會'), ('超市', '農漁會'), ('肥料倉庫', '農漁會'),

-- 合作社
('理事會', '合作社'), ('監事會', '合作社'), ('理事主席室', '合作社'), ('經理室', '合作社'), 
('業務部', '合作社'), ('財務部', '合作社'), ('總務部', '合作社'), ('行銷企劃部', '合作社'), 
('倉儲物流部', '合作社'), ('加工部', '合作社'),

-- 產銷班
('班長室', '產銷班'), ('書記', '產銷班'), ('會計', '產銷班'), ('班員大會', '產銷班'), 
('共同採購組', '產銷班'), ('共同行銷組', '產銷班'), ('品質管理組', '產銷班'), ('財務管理組', '產銷班'),

-- 企業
('董事會', '企業'), ('總經理室', '企業'), ('營運部', '企業'), ('人資部 (HR)', '企業'), 
('財務部', '企業'), ('法務部', '企業'), ('資訊部 (IT)', '企業'), ('研發部 (R&D)', '企業'), 
('行銷部', '企業'), ('業務部 (Sales)', '企業'), ('客服部', '企業'), ('生產部', '企業'), 
('品保部 (QA)', '企業'), ('採購部', '企業'), ('公關部 (PR)', '企業'), ('專案管理辦公室 (PMO)', '企業'),

-- 其他
('其他', '其他');

-- 職稱字典庫
-- 執行前先清空確保重啟ID
TRUNCATE TABLE Job_Titles;

INSERT INTO Job_Titles (title_name, tier_level, default_weight) VALUES
-- Tier 1 (10分)
('縣長', 1, 10), ('部長', 1, 10), ('立法委員', 1, 10), ('署長', 1, 10), ('人事長', 1, 10),

-- Tier 2 (8分)
('局長', 2, 8), ('處長', 2, 8), ('代理處長', 2, 8), ('鄉長', 2, 8), ('鎮長', 2, 8), ('市長', 2, 8), 
('分署長', 2, 8), ('場長', 2, 8), ('副人事長', 2, 8), ('校長', 2, 8), ('理事長', 2, 8), 
('總幹事', 2, 8), ('合作社理事主席', 2, 8), ('董事長', 2, 8), ('總經理', 2, 8), ('執行長', 2, 8), ('創辦人', 2, 8), ('班長', 2, 8),

-- Tier 3 (5分)
('副縣長', 3, 5), ('秘書長', 3, 5), ('主任秘書', 3, 5), ('主秘', 3, 5), ('副處長', 3, 5), ('副署長', 3, 5), 
('參事', 3, 5), ('專門委員', 3, 5), ('高級分析師', 3, 5), ('機要秘書', 3, 5), ('副分署長', 3, 5), ('副場長', 3, 5), 
('副執行長', 3, 5), ('農會秘書', 3, 5), ('常務監事', 3, 5), ('合作社監事主席', 3, 5), ('副總經理', 3, 5), ('副總', 3, 5), 
('協理', 3, 5), ('營運長', 3, 5), ('特助', 3, 5),

-- Tier 4 (3分)
('科長', 4, 3), ('課長', 4, 3), ('組長', 4, 3), ('簡任技正', 4, 3), ('主任', 4, 3), ('秘書', 4, 3), ('視察', 4, 3), 
('專員', 4, 3), ('分析師', 4, 3), ('設計師', 4, 3), ('供銷部主任', 4, 3), ('推廣部主任', 4, 3), ('旅遊部主任', 4, 3), 
('農漁會理事', 4, 3), ('經理', 4, 3), ('副理', 4, 3), ('廠長', 4, 3), ('專案經理 (PM)', 4, 3),

-- Tier 5 (1分)
('科員', 5, 1), ('課員', 5, 1), ('助理員', 5, 1), ('助理設計師', 5, 1), ('辦事員', 5, 1), ('書記', 5, 1), ('指導員', 5, 1), 
('助理幹事', 5, 1), ('企業專員', 5, 1), ('助理', 5, 1), ('行政秘書', 5, 1), ('記者', 5, 1), ('一般員工', 5, 1), 
('約聘人員', 5, 1), ('會計', 5, 1), ('一般會務人員', 5, 1), ('班員', 5, 1), ('其他', 5, 1);
