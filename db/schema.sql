-- HOAmeet Database Schema
-- Last updated: 2026-02-24

-- 1. 建立字典表 (單位與職稱)
-- 單位字典表 (區分政府、學術、外部)
CREATE TABLE IF NOT EXISTS Departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    dept_type ENUM('政府', '學術', '外部') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 職稱與權重字典表 (核心積分依據)
CREATE TABLE IF NOT EXISTS Job_Titles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title_name VARCHAR(100) NOT NULL,
    default_weight INT DEFAULT 1 COMMENT '預設權重積分(例如長官為5, 承辦為1)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 建立使用者表 (支援 Google 登入)
-- 使用者主表
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL, -- 一般註冊密碼雜湊，Google 登入者可為 NULL
    first_name VARCHAR(50) NOT NULL,
    department_id INT NULL,          -- 允許為空 (因 Google 首次登入時還沒填)
    job_title_id INT NULL,           -- 允許為空 (因 Google 首次登入時還沒填)
    auth_provider VARCHAR(20) DEFAULT 'email' COMMENT '登入方式: email, google',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES Departments(id),
    FOREIGN KEY (job_title_id) REFERENCES Job_Titles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 建立會議與時段主表 (包含黑名單與狀態)
-- 會議主表
CREATE TABLE IF NOT EXISTS Meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    duration_minutes INT NOT NULL COMMENT '會議時數(分鐘)',
    location VARCHAR(200) NOT NULL,
    is_online BOOLEAN DEFAULT FALSE COMMENT '是否為線上會議',
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
ADD COLUMN IF NOT EXISTS ack_status ENUM('pending', 'acknowledged') DEFAULT 'acknowledged' 
COMMENT '變動確認狀態：pending(未讀/未確認), acknowledged(已確認)';

-- 在會議表新增版本號，處理 .ics 行事曆與自動覆寫/取消更新
ALTER TABLE Meetings
ADD COLUMN IF NOT EXISTS sequence_num INT DEFAULT 0 
COMMENT '會議版本號：每次改期加1，用於更新使用者的 Google 行事曆';

-- 6. 全體權限分層機制 (RBAC)
-- 在 Users 表新增 global_role 欄位，定義全域權限
ALTER TABLE Users 
ADD COLUMN IF NOT EXISTS global_role ENUM('super_admin', 'creator', 'user') DEFAULT 'user' 
COMMENT '全域角色: super_admin(最高權限), creator(可發起會議), user(僅能參與)';

