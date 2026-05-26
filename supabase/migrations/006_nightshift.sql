-- ==========================================
-- Migration 006: 大夜班工作表
-- ==========================================

-- 巡視區域
CREATE TABLE IF NOT EXISTS nightshift_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  floor text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- 固定任務清單（原則表）
CREATE TABLE IF NOT EXISTS nightshift_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  time_slot text NOT NULL,
  area_slug text REFERENCES nightshift_areas(slug),
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 每日班次
CREATE TABLE IF NOT EXISTS nightshift_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL UNIQUE,
  status text DEFAULT 'active',
  handover_notes text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- 任務完成紀錄
CREATE TABLE IF NOT EXISTS nightshift_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES nightshift_sessions(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES nightshift_task_templates(id),
  extra_task_id uuid,
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz DEFAULT now(),
  notes text
);

-- 管理員加派任務
CREATE TABLE IF NOT EXISTS nightshift_extra_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES nightshift_sessions(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  time_slot text NOT NULL,
  area_slug text,
  sort_order int DEFAULT 0,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- QR 到場紀錄
CREATE TABLE IF NOT EXISTS nightshift_area_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES nightshift_sessions(id) ON DELETE CASCADE NOT NULL,
  area_slug text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  checked_in_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE nightshift_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightshift_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightshift_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightshift_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightshift_extra_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightshift_area_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read areas" ON nightshift_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read templates" ON nightshift_task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all sessions" ON nightshift_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read completions" ON nightshift_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all completions" ON nightshift_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read extra tasks" ON nightshift_extra_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all extra tasks" ON nightshift_extra_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all checkins" ON nightshift_area_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 種子：巡視區域
INSERT INTO nightshift_areas (slug, name, floor, sort_order) VALUES
('2f', '2F', '2F', 1),
('3f', '3F', '3F', 2),
('5f', '5F', '5F', 3),
('6f', '6F', '6F', 4),
('7f', '7F', '7F', 5),
('8f', '8F', '8F', 6),
('roof', 'R樓', 'R', 7),
('1f-lobby', '1F大廳', '1F', 8),
('b1-parking', 'B1停車場', 'B1', 9),
('gym', '健身房', '1F', 10),
('kitchen', '廚房', '1F', 11),
('perimeter', '外圍', null, 12)
ON CONFLICT (slug) DO NOTHING;

-- 種子：固定任務清單
INSERT INTO nightshift_task_templates (title, category, time_slot, area_slug, sort_order) VALUES
('關閉2、6、7、8F電燈、窗戶與冷氣', '巡視', '22:00', null, 1),
('拔掉健身房器材插頭，確認廚房瓦斯是否關閉', '巡視', '22:00', 'gym', 2),
('巡視外圍一圈，確認B1車庫鐵門是否關閉', '巡視', '22:00', 'b1-parking', 3),
('關閉3、5F電燈、窗戶與冷氣', '巡視', '23:00', null, 4),
('關閉1F電子看板、電燈', '巡視', '23:00', '1f-lobby', 5),
('貼紙、交班', '櫃台事務', '23:00', null, 6),
('排房、製作入住登記表及早餐券', '櫃台事務', '23:00', null, 7),
('檢查BOOKING訂單', '櫃台事務', '23:00', null, 8),
('印製早餐登記表，確認用餐人數', '櫃台事務', '23:00', null, 9),
('完成早班班代交代事務', '櫃台事務', '23:00', null, 10),
('擦拖洗培坊', '清潔', '02:00', null, 11),
('擦拖健身房', '清潔', '02:00', 'gym', 12),
('擦拖雜貨店', '清潔', '02:00', null, 13),
('擦拖電梯內及1F電梯間', '清潔', '02:00', null, 14),
('擦拖大廳', '清潔', '02:00', '1f-lobby', 15),
('清掃1F大廳及健身房廁所，填寫清潔表', '清潔', '02:00', '1f-lobby', 16),
('擦拭健身房器材', '清潔', '02:00', 'gym', 17),
('擦拭書架、櫃台後方咖啡架', '清潔', '02:00', null, 18),
('擦拭大廳桌面', '清潔', '02:00', '1f-lobby', 19),
('清潔烘培坊微波爐', '清潔', '02:00', null, 20),
('倒垃圾', '清潔', '02:00', null, 21),
('清掃大門及健身房外圍落葉與垃圾', '清潔', '02:00', 'perimeter', 22),
('打開園區大門', '開館', '05:00', 'perimeter', 23),
('打開電子看板', '開館', '05:00', '1f-lobby', 24),
('雜貨店補貨', '開館', '05:00', null, 25),
('早餐登記表放至餐廳', '開館', '05:00', null, 26),
('長輩morning call', '下班前', '06:30', null, 27),
('傳送當日大夜工作表至大夜群', '下班前', '06:30', null, 28),
('交接', '下班前', '06:30', null, 29),
('確認長輩是否下樓用餐', '下班前', '06:30', null, 30),
('交班結帳', '下班前', '06:30', null, 31);