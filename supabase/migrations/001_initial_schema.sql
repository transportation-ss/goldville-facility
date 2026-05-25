-- ============================================================
-- 好好園館 工務管理系統 — 初始資料庫 Schema
-- 版本：v1.0
-- 執行方式：Supabase Dashboard > SQL Editor > 貼上執行
-- ============================================================

-- ─────────────────────────────────────────
-- 0. 擴充套件
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. 使用者角色設定
-- ─────────────────────────────────────────
-- 角色：reporter(通報方) | technician(工務人員) | manager(管理者) | admin(系統管理員)

CREATE TABLE public.user_profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  unit          text,                        -- 所屬單位，例：房務部、產品部
  role          text NOT NULL DEFAULT 'reporter'
                CHECK (role IN ('reporter', 'technician', 'manager', 'admin')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. 工務派工（區塊一）
-- ─────────────────────────────────────────

CREATE TABLE public.work_orders (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 通報方填寫
  requester_name   text NOT NULL,
  requester_unit   text NOT NULL,
  priority         text NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('urgent', 'normal')),
  location         text NOT NULL,
  description      text NOT NULL,
  special_notes    text,
  -- 狀態管理
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  -- 工務部填寫
  assigned_to      uuid REFERENCES public.user_profiles(id),
  requires_budget  boolean NOT NULL DEFAULT false,
  estimated_cost   numeric(10,2),
  actual_cost      numeric(10,2),
  budget_notes     text,
  deadline         date,
  completion_notes text,
  completed_at     timestamptz,
  -- 系統欄位
  created_by       uuid REFERENCES public.user_profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 工單照片
CREATE TABLE public.work_order_photos (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id  uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,              -- Supabase Storage 路徑
  photo_type     text NOT NULL DEFAULT 'before'
                 CHECK (photo_type IN ('before', 'after', 'reference')),
  file_name      text,
  uploaded_by    uuid REFERENCES public.user_profiles(id),
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);

-- 工單回應記錄（雙向溝通）
CREATE TABLE public.work_order_replies (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id  uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  replied_by     uuid REFERENCES public.user_profiles(id),
  role_at_time   text,                       -- 記錄當下角色
  content        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 3. 保養提醒（區塊二）
-- ─────────────────────────────────────────

CREATE TABLE public.maintenance_schedules (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              text NOT NULL,           -- 例：水塔清洗、消防申報
  description       text,
  category          text,                    -- 例：衛生、安全、法規申報
  frequency         text NOT NULL
                    CHECK (frequency IN ('monthly', 'quarterly', 'biannual', 'yearly', 'custom')),
  frequency_days    int,                     -- frequency = custom 時使用
  responsible_unit  text,
  vendor            text,                    -- 外包廠商
  vendor_contact    text,
  last_done_at      date,
  next_due_at       date,
  advance_notice_days int DEFAULT 14,        -- 提前幾天提醒
  notes             text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 保養執行記錄
CREATE TABLE public.maintenance_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id     uuid NOT NULL REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
  done_at         date NOT NULL,
  done_by         text,
  vendor_used     text,
  cost            numeric(10,2),
  result          text,                      -- 正常/異常/待追蹤
  notes           text,
  next_due_at     date,                      -- 執行後自動計算下次
  created_by      uuid REFERENCES public.user_profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 4. 硬體說明書 + 財產盤點（區塊三）
-- ─────────────────────────────────────────

CREATE TABLE public.hardware_items (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             text NOT NULL,
  category         text,                     -- 例：空調、消防、電梯
  location         text,                     -- 位置描述
  floor            text,
  room_no          text,
  brand            text,
  model            text,
  serial_no        text,
  purchase_date    date,
  warranty_expiry  date,
  vendor           text,
  vendor_contact   text,
  asset_no         text,                     -- 財產編號
  condition        text DEFAULT 'good'
                   CHECK (condition IN ('good', 'fair', 'poor', 'decommissioned')),
  common_issues    text,
  troubleshooting  text,
  specs            text,
  notes            text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 5. 耗材進銷存（區塊四）
-- ─────────────────────────────────────────

CREATE TABLE public.consumables (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              text NOT NULL,
  category          text,
  use_case          text,                    -- 使用場合
  storage_location  text,                   -- 存放位置
  unit              text NOT NULL DEFAULT '個',
  current_quantity  numeric(10,2) NOT NULL DEFAULT 0,
  min_quantity      numeric(10,2) NOT NULL DEFAULT 0,   -- 警戒庫存量
  unit_cost         numeric(10,2),
  vendor            text,
  vendor_contact    text,
  notes             text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 耗材異動記錄
CREATE TABLE public.consumable_transactions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumable_id    uuid NOT NULL REFERENCES public.consumables(id) ON DELETE RESTRICT,
  type             text NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  quantity         numeric(10,2) NOT NULL,
  quantity_before  numeric(10,2),            -- 異動前數量
  quantity_after   numeric(10,2),            -- 異動後數量
  work_order_id    uuid REFERENCES public.work_orders(id),  -- 關聯工單（出庫時）
  reason           text,
  notes            text,
  created_by       uuid REFERENCES public.user_profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 6. 房間硬體登錄（區塊五）
-- ─────────────────────────────────────────

CREATE TABLE public.rooms (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,               -- 例：201房、1F餐廳、健身房
  floor        text,
  room_type    text,                        -- 客房/公共區/辦公室/設備間
  description  text,
  sort_order   int DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 房間內的硬體項目
CREATE TABLE public.room_hardware (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name          text NOT NULL,
  category      text,
  brand         text,
  model         text,
  serial_no     text,
  condition     text DEFAULT 'good'
                CHECK (condition IN ('good', 'fair', 'poor', 'decommissioned')),
  install_date  date,
  notes         text,
  hardware_id   uuid REFERENCES public.hardware_items(id),  -- 可關聯到硬體說明書
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 7. 水電抄表紀錄（區塊六）
-- ─────────────────────────────────────────

-- 抄表點定義（可彈性增減）
CREATE TABLE public.utility_meters (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,               -- 例：201房水表、1F餐廳電表
  meter_type   text NOT NULL CHECK (meter_type IN ('water', 'electricity')),
  location     text,
  floor        text,
  room_no      text,
  meter_no     text,                        -- 實體表號
  unit         text DEFAULT '度',           -- 電:度 / 水:噸
  sort_order   int DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 每次抄表的主記錄（一次抄表 = 一個 session）
CREATE TABLE public.utility_sessions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reading_date   date NOT NULL,
  status         text DEFAULT 'complete'
                 CHECK (status IN ('complete', 'partial', 'draft')),
  special_notes  text,
  recorded_by    uuid REFERENCES public.user_profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 每支表的讀數（一個 session × N 支表）
CREATE TABLE public.utility_readings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      uuid NOT NULL REFERENCES public.utility_sessions(id) ON DELETE CASCADE,
  meter_id        uuid NOT NULL REFERENCES public.utility_meters(id),
  reading_value   numeric(12,2),            -- 本次讀數
  previous_value  numeric(12,2),            -- 上次讀數（由系統帶入）
  usage_amount    numeric(12,2)             -- 用量（本次 - 上次）
                  GENERATED ALWAYS AS (
                    CASE WHEN reading_value IS NOT NULL AND previous_value IS NOT NULL
                    THEN reading_value - previous_value ELSE NULL END
                  ) STORED,
  is_abnormal     boolean NOT NULL DEFAULT false,
  abnormal_notes  text,
  UNIQUE (session_id, meter_id)
);

-- ─────────────────────────────────────────
-- 8. Indexes（查詢優化）
-- ─────────────────────────────────────────

CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_created_at ON public.work_orders(created_at DESC);
CREATE INDEX idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX idx_maintenance_next_due ON public.maintenance_schedules(next_due_at);
CREATE INDEX idx_consumable_transactions_consumable ON public.consumable_transactions(consumable_id);
CREATE INDEX idx_utility_readings_session ON public.utility_readings(session_id);
CREATE INDEX idx_utility_readings_meter ON public.utility_readings(meter_id);
CREATE INDEX idx_utility_sessions_date ON public.utility_sessions(reading_date DESC);

-- ─────────────────────────────────────────
-- 9. updated_at 自動更新 Trigger
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_hardware_items_updated_at
  BEFORE UPDATE ON public.hardware_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_consumables_updated_at
  BEFORE UPDATE ON public.consumables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_utility_sessions_updated_at
  BEFORE UPDATE ON public.utility_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────
-- 10. 耗材異動後自動更新庫存 Trigger
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_consumable_transaction()
RETURNS TRIGGER AS $$
DECLARE
  current_qty numeric;
BEGIN
  SELECT current_quantity INTO current_qty
  FROM public.consumables WHERE id = NEW.consumable_id;

  -- 記錄異動前數量
  NEW.quantity_before := current_qty;

  -- 計算異動後數量
  IF NEW.type = 'in' THEN
    NEW.quantity_after := current_qty + NEW.quantity;
  ELSIF NEW.type = 'out' THEN
    NEW.quantity_after := current_qty - NEW.quantity;
  ELSIF NEW.type = 'adjust' THEN
    NEW.quantity_after := NEW.quantity;  -- adjust 直接設定目標數量
  END IF;

  -- 更新耗材主表數量
  UPDATE public.consumables
  SET current_quantity = NEW.quantity_after,
      updated_at = now()
  WHERE id = NEW.consumable_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consumable_transaction
  BEFORE INSERT ON public.consumable_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_consumable_transaction();

-- ─────────────────────────────────────────
-- 11. 新使用者自動建立 profile Trigger
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'reporter')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- 12. Row Level Security（RLS）
-- ─────────────────────────────────────────

ALTER TABLE public.user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_replies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_hardware           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_meters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_readings        ENABLE ROW LEVEL SECURITY;

-- Helper function：取得目前使用者角色
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ── user_profiles ──
CREATE POLICY "使用者可讀取所有 profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "使用者只能修改自己的 profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "admin 可管理所有 profiles" ON public.user_profiles
  FOR ALL USING (public.get_my_role() = 'admin');

-- ── work_orders ──
CREATE POLICY "所有登入者可以讀取工單" ON public.work_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "登入者可以新增工單" ON public.work_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "工務和管理者可以更新工單" ON public.work_orders
  FOR UPDATE USING (
    public.get_my_role() IN ('technician', 'manager', 'admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "admin 和 manager 可以刪除工單" ON public.work_orders
  FOR DELETE USING (public.get_my_role() IN ('manager', 'admin'));

-- ── work_order_photos ──
CREATE POLICY "所有登入者可讀取照片" ON public.work_order_photos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "登入者可以上傳照片" ON public.work_order_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── work_order_replies ──
CREATE POLICY "所有登入者可讀取回應" ON public.work_order_replies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "登入者可以新增回應" ON public.work_order_replies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── maintenance_schedules ──
CREATE POLICY "所有登入者可讀取保養排程" ON public.maintenance_schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "manager 和 admin 可管理保養排程" ON public.maintenance_schedules
  FOR ALL USING (public.get_my_role() IN ('manager', 'admin'));

-- ── maintenance_logs ──
CREATE POLICY "所有登入者可讀取保養記錄" ON public.maintenance_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "工務以上角色可新增保養記錄" ON public.maintenance_logs
  FOR INSERT WITH CHECK (public.get_my_role() IN ('technician', 'manager', 'admin'));

-- ── hardware_items ──
CREATE POLICY "所有登入者可讀取硬體" ON public.hardware_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "manager 和 admin 可管理硬體" ON public.hardware_items
  FOR ALL USING (public.get_my_role() IN ('manager', 'admin'));

-- ── consumables ──
CREATE POLICY "所有登入者可讀取耗材" ON public.consumables
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "工務以上角色可管理耗材" ON public.consumables
  FOR ALL USING (public.get_my_role() IN ('technician', 'manager', 'admin'));

-- ── consumable_transactions ──
CREATE POLICY "所有登入者可讀取耗材異動" ON public.consumable_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "工務以上角色可新增耗材異動" ON public.consumable_transactions
  FOR INSERT WITH CHECK (public.get_my_role() IN ('technician', 'manager', 'admin'));

-- ── rooms / room_hardware ──
CREATE POLICY "所有登入者可讀取房間" ON public.rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "manager 和 admin 可管理房間" ON public.rooms
  FOR ALL USING (public.get_my_role() IN ('manager', 'admin'));

CREATE POLICY "所有登入者可讀取房間硬體" ON public.room_hardware
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "manager 和 admin 可管理房間硬體" ON public.room_hardware
  FOR ALL USING (public.get_my_role() IN ('manager', 'admin'));

-- ── utility ──
CREATE POLICY "所有登入者可讀取水電資料" ON public.utility_meters
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "manager 和 admin 可管理水電表設定" ON public.utility_meters
  FOR ALL USING (public.get_my_role() IN ('manager', 'admin'));

CREATE POLICY "所有登入者可讀取抄表記錄" ON public.utility_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "工務以上角色可新增抄表記錄" ON public.utility_sessions
  FOR INSERT WITH CHECK (public.get_my_role() IN ('technician', 'manager', 'admin'));

CREATE POLICY "工務以上角色可更新抄表記錄" ON public.utility_sessions
  FOR UPDATE USING (public.get_my_role() IN ('technician', 'manager', 'admin'));

CREATE POLICY "所有登入者可讀取讀數" ON public.utility_readings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "工務以上角色可新增讀數" ON public.utility_readings
  FOR INSERT WITH CHECK (public.get_my_role() IN ('technician', 'manager', 'admin'));

CREATE POLICY "工務以上角色可更新讀數" ON public.utility_readings
  FOR UPDATE USING (public.get_my_role() IN ('technician', 'manager', 'admin'));

-- ─────────────────────────────────────────
-- 13. Storage Bucket（工單照片）
-- ─────────────────────────────────────────
-- 請在 Supabase Dashboard > Storage 手動建立 bucket: "work-order-photos"
-- 設定：Public bucket = false（需登入才能存取）
-- 或執行以下（需 service_role）：
-- INSERT INTO storage.buckets (id, name, public) VALUES ('work-order-photos', 'work-order-photos', false);

-- ─────────────────────────────────────────
-- 14. 預設資料：保養項目
-- ─────────────────────────────────────────

INSERT INTO public.maintenance_schedules (name, category, frequency, advance_notice_days, notes) VALUES
  ('水塔清洗', '衛生', 'biannual', 30, '每半年一次，需聯絡外包廠商'),
  ('園館消毒', '衛生', 'quarterly', 14, '每季一次全區消毒'),
  ('消防設備年度申報', '法規申報', 'yearly', 30, '向消防局申報，需備齊維修記錄'),
  ('公安申報', '法規申報', 'yearly', 30, '建築公安檢查申報'),
  ('消防設備定期檢查', '安全', 'biannual', 14, '半年一次消防設備自主檢查'),
  ('電梯年度檢查', '安全', 'yearly', 30, '電梯定期檢查申報'),
  ('冷氣保養', '設備', 'biannual', 14, '半年一次冷媒補充與清洗');

-- ─────────────────────────────────────────
-- 15. 預設資料：水電抄表點
-- （依照你原有 Google Sheet 欄位順序）
-- ─────────────────────────────────────────

INSERT INTO public.utility_meters (name, meter_type, location, floor, room_no, unit, sort_order) VALUES
  -- 公共水表
  ('頂樓水表',       'water', '頂樓',   '頂樓', NULL, '度', 10),
  ('1F醫護室水表',   'water', '1F醫護室', '1F', '醫護室', '度', 20),
  ('1E體驗教室水表', 'water', '1E體驗教室', '1F', '體驗教室', '度', 30),
  ('1D美容院水表',   'water', '1D美容院', '1F', '美容院', '度', 40),
  ('1C餐廳水表',     'water', '1C餐廳', '1F', '餐廳', '度', 50),
  ('1B烘焙坊水表',   'water', '1B烘焙坊', '1F', '烘焙坊', '度', 60),
  ('1A物理治療室水表','water', '1A物理治療室', '1F', '物理治療室', '度', 70),
  -- 公共電表
  ('小館電表',       'electricity', '小館', '1F', NULL, '度', 80),
  ('8F電表',         'electricity', '8樓', '8F', NULL, '度', 90),
  -- 2F 房間
  ('201房水表', 'water', '2F', '2F', '201', '度', 201), ('201房電表', 'electricity', '2F', '2F', '201', '度', 2010),
  ('202房水表', 'water', '2F', '2F', '202', '度', 202), ('202房電表', 'electricity', '2F', '2F', '202', '度', 2020),
  ('203房水表', 'water', '2F', '2F', '203', '度', 203), ('203房電表', 'electricity', '2F', '2F', '203', '度', 2030),
  ('204房水表', 'water', '2F', '2F', '204', '度', 204), ('204房電表', 'electricity', '2F', '2F', '204', '度', 2040),
  ('205房水表', 'water', '2F', '2F', '205', '度', 205), ('205房電表', 'electricity', '2F', '2F', '205', '度', 2050),
  ('206房水表', 'water', '2F', '2F', '206', '度', 206), ('206房電表', 'electricity', '2F', '2F', '206', '度', 2060),
  ('207房水表', 'water', '2F', '2F', '207', '度', 207), ('207房電表', 'electricity', '2F', '2F', '207', '度', 2070),
  ('208房水表', 'water', '2F', '2F', '208', '度', 208), ('208房電表', 'electricity', '2F', '2F', '208', '度', 2080),
  ('209房水表', 'water', '2F', '2F', '209', '度', 209), ('209房電表', 'electricity', '2F', '2F', '209', '度', 2090),
  ('210房水表', 'water', '2F', '2F', '210', '度', 210), ('210房電表', 'electricity', '2F', '2F', '210', '度', 2100),
  ('211房水表', 'water', '2F', '2F', '211', '度', 211), ('211房電表', 'electricity', '2F', '2F', '211', '度', 2110),
  ('212房水表', 'water', '2F', '2F', '212', '度', 212), ('212房電表', 'electricity', '2F', '2F', '212', '度', 2120),
  ('213房水表', 'water', '2F', '2F', '213', '度', 213), ('213房電表', 'electricity', '2F', '2F', '213', '度', 2130),
  ('214房水表', 'water', '2F', '2F', '214', '度', 214), ('214房電表', 'electricity', '2F', '2F', '214', '度', 2140),
  ('215房水表', 'water', '2F', '2F', '215', '度', 215), ('215房電表', 'electricity', '2F', '2F', '215', '度', 2150),
  ('216房水表', 'water', '2F', '2F', '216', '度', 216), ('216房電表', 'electricity', '2F', '2F', '216', '度', 2160),
  -- 3F 房間
  ('301房水表', 'water', '3F', '3F', '301', '度', 301), ('301房電表', 'electricity', '3F', '3F', '301', '度', 3010),
  ('302房水表', 'water', '3F', '3F', '302', '度', 302), ('302房電表', 'electricity', '3F', '3F', '302', '度', 3020),
  ('303房水表', 'water', '3F', '3F', '303', '度', 303), ('303房電表', 'electricity', '3F', '3F', '303', '度', 3030),
  ('304房水表', 'water', '3F', '3F', '304', '度', 304), ('304房電表', 'electricity', '3F', '3F', '304', '度', 3040),
  ('305房水表', 'water', '3F', '3F', '305', '度', 305), ('305房電表', 'electricity', '3F', '3F', '305', '度', 3050),
  ('306房水表', 'water', '3F', '3F', '306', '度', 306), ('306房電表', 'electricity', '3F', '3F', '306', '度', 3060),
  ('307房水表', 'water', '3F', '3F', '307', '度', 307), ('307房電表', 'electricity', '3F', '3F', '307', '度', 3070),
  ('308房水表', 'water', '3F', '3F', '308', '度', 308), ('308房電表', 'electricity', '3F', '3F', '308', '度', 3080),
  ('309房水表', 'water', '3F', '3F', '309', '度', 309), ('309房電表', 'electricity', '3F', '3F', '309', '度', 3090),
  ('310房水表', 'water', '3F', '3F', '310', '度', 310), ('310房電表', 'electricity', '3F', '3F', '310', '度', 3100),
  ('311房水表', 'water', '3F', '3F', '311', '度', 311), ('311房電表', 'electricity', '3F', '3F', '311', '度', 3110),
  ('312房水表', 'water', '3F', '3F', '312', '度', 312), ('312房電表', 'electricity', '3F', '3F', '312', '度', 3120),
  ('313房水表', 'water', '3F', '3F', '313', '度', 313), ('313房電表', 'electricity', '3F', '3F', '313', '度', 3130),
  ('314房水表', 'water', '3F', '3F', '314', '度', 314), ('314房電表', 'electricity', '3F', '3F', '314', '度', 3140),
  ('315房水表', 'water', '3F', '3F', '315', '度', 315), ('315房電表', 'electricity', '3F', '3F', '315', '度', 3150),
  ('316房水表', 'water', '3F', '3F', '316', '度', 316), ('316房電表', 'electricity', '3F', '3F', '316', '度', 3160),
  -- 5F 房間
  ('501房水表', 'water', '5F', '5F', '501', '度', 501), ('501房電表', 'electricity', '5F', '5F', '501', '度', 5010),
  ('502房水表', 'water', '5F', '5F', '502', '度', 502), ('502房電表', 'electricity', '5F', '5F', '502', '度', 5020),
  ('503房水表', 'water', '5F', '5F', '503', '度', 503), ('503房電表', 'electricity', '5F', '5F', '503', '度', 5030),
  ('504房水表', 'water', '5F', '5F', '504', '度', 504), ('504房電表', 'electricity', '5F', '5F', '504', '度', 5040),
  ('505房水表', 'water', '5F', '5F', '505', '度', 505), ('505房電表', 'electricity', '5F', '5F', '505', '度', 5050),
  ('506房水表', 'water', '5F', '5F', '506', '度', 506), ('506房電表', 'electricity', '5F', '5F', '506', '度', 5060),
  ('507房水表', 'water', '5F', '5F', '507', '度', 507), ('507房電表', 'electricity', '5F', '5F', '507', '度', 5070),
  ('508房水表', 'water', '5F', '5F', '508', '度', 508), ('508房電表', 'electricity', '5F', '5F', '508', '度', 5080),
  ('509房水表', 'water', '5F', '5F', '509', '度', 509), ('509房電表', 'electricity', '5F', '5F', '509', '度', 5090),
  ('510房水表', 'water', '5F', '5F', '510', '度', 510), ('510房電表', 'electricity', '5F', '5F', '510', '度', 5100),
  ('511房水表', 'water', '5F', '5F', '511', '度', 511), ('511房電表', 'electricity', '5F', '5F', '511', '度', 5110),
  ('512房水表', 'water', '5F', '5F', '512', '度', 512), ('512房電表', 'electricity', '5F', '5F', '512', '度', 5120),
  ('513房水表', 'water', '5F', '5F', '513', '度', 513), ('513房電表', 'electricity', '5F', '5F', '513', '度', 5130),
  ('514房水表', 'water', '5F', '5F', '514', '度', 514), ('514房電表', 'electricity', '5F', '5F', '514', '度', 5140),
  ('515房水表', 'water', '5F', '5F', '515', '度', 515), ('515房電表', 'electricity', '5F', '5F', '515', '度', 5150),
  -- 6F 房間
  ('601房水表', 'water', '6F', '6F', '601', '度', 601), ('601房電表', 'electricity', '6F', '6F', '601', '度', 6010),
  ('602房水表', 'water', '6F', '6F', '602', '度', 602), ('602房電表', 'electricity', '6F', '6F', '602', '度', 6020),
  ('603房水表', 'water', '6F', '6F', '603', '度', 603), ('603房電表', 'electricity', '6F', '6F', '603', '度', 6030),
  ('604房水表', 'water', '6F', '6F', '604', '度', 604), ('604房電表', 'electricity', '6F', '6F', '604', '度', 6040),
  ('605房水表', 'water', '6F', '6F', '605', '度', 605), ('605房電表', 'electricity', '2F', '6F', '605', '度', 6050),
  ('606房水表', 'water', '6F', '6F', '606', '度', 606), ('606房電表', 'electricity', '6F', '6F', '606', '度', 6060),
  ('607房水表', 'water', '6F', '6F', '607', '度', 607), ('607房電表', 'electricity', '6F', '6F', '607', '度', 6070),
  ('608房水表', 'water', '6F', '6F', '608', '度', 608), ('608房電表', 'electricity', '6F', '6F', '608', '度', 6080),
  ('609房水表', 'water', '6F', '6F', '609', '度', 609), ('609房電表', 'electricity', '6F', '6F', '609', '度', 6090),
  ('610房水表', 'water', '6F', '6F', '610', '度', 610), ('610房電表', 'electricity', '6F', '6F', '610', '度', 6100),
  ('611房水表', 'water', '6F', '6F', '611', '度', 611), ('611房電表', 'electricity', '6F', '6F', '611', '度', 6110),
  ('612房水表', 'water', '6F', '6F', '612', '度', 612), ('612房電表', 'electricity', '6F', '6F', '612', '度', 6120),
  ('613房水表', 'water', '6F', '6F', '613', '度', 613), ('613房電表', 'electricity', '6F', '6F', '613', '度', 6130),
  ('614房水表', 'water', '6F', '6F', '614', '度', 614), ('614房電表', 'electricity', '6F', '6F', '614', '度', 6140),
  ('615房水表', 'water', '6F', '6F', '615', '度', 615), ('615房電表', 'electricity', '6F', '6F', '615', '度', 6150),
  -- 7F 房間
  ('701房水表', 'water', '7F', '7F', '701', '度', 701), ('701房電表', 'electricity', '7F', '7F', '701', '度', 7010),
  ('702房水表', 'water', '7F', '7F', '702', '度', 702), ('702房電表', 'electricity', '7F', '7F', '702', '度', 7020),
  ('703房水表', 'water', '7F', '7F', '703', '度', 703), ('703房電表', 'electricity', '7F', '7F', '703', '度', 7030),
  ('704房水表', 'water', '7F', '7F', '704', '度', 704), ('704房電表', 'electricity', '7F', '7F', '704', '度', 7040),
  ('705房水表', 'water', '7F', '7F', '705', '度', 705), ('705房電表', 'electricity', '7F', '7F', '705', '度', 7050),
  ('706房水表', 'water', '7F', '7F', '706', '度', 706), ('706房電表', 'electricity', '7F', '7F', '706', '度', 7060),
  ('707房水表', 'water', '7F', '7F', '707', '度', 707), ('707房電表', 'electricity', '7F', '7F', '707', '度', 7070),
  ('708房水表', 'water', '7F', '7F', '708', '度', 708), ('708房電表', 'electricity', '7F', '7F', '708', '度', 7080),
  ('709房水表', 'water', '7F', '7F', '709', '度', 709), ('709房電表', 'electricity', '7F', '7F', '709', '度', 7090),
  ('710房水表', 'water', '7F', '7F', '710', '度', 710), ('710房電表', 'electricity', '7F', '7F', '710', '度', 7100),
  ('711房水表', 'water', '7F', '7F', '711', '度', 711), ('711房電表', 'electricity', '7F', '7F', '711', '度', 7110),
  ('712房水表', 'water', '7F', '7F', '712', '度', 712), ('712房電表', 'electricity', '7F', '7F', '712', '度', 7120),
  ('713房水表', 'water', '7F', '7F', '713', '度', 713), ('713房電表', 'electricity', '7F', '7F', '713', '度', 7130),
  ('714房水表', 'water', '7F', '7F', '714', '度', 714), ('714房電表', 'electricity', '7F', '7F', '714', '度', 7140),
  ('715房水表', 'water', '7F', '7F', '715', '度', 715), ('715房電表', 'electricity', '7F', '7F', '715', '度', 7150);

-- ============================================================
-- Schema 建立完成
-- 資料表：14 張
-- Trigger：9 個
-- RLS Policy：28 條
-- 預設資料：7 筆保養項目、160+ 個抄表點
-- ============================================================
