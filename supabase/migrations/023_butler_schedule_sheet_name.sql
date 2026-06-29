-- 加 sheet_name 欄位，讓班表可以先存 Google Sheets 上的姓名
-- 之後帳號建立後，再建立 sheet_name → staff_id 的對應

-- 1. staff_id 改為可為 null（帳號建立前先留空）
ALTER TABLE public.butler_schedules
  ALTER COLUMN staff_id DROP NOT NULL;

-- 2. 加 sheet_name 欄位
ALTER TABLE public.butler_schedules
  ADD COLUMN IF NOT EXISTS sheet_name text;

-- 3. 原本的 unique constraint 是 (staff_id, schedule_date)，
--    改成 (sheet_name, schedule_date) 讓沒有帳號的班表也能正確寫入
ALTER TABLE public.butler_schedules
  DROP CONSTRAINT IF EXISTS butler_schedules_staff_id_schedule_date_key;

ALTER TABLE public.butler_schedules
  ADD CONSTRAINT butler_schedules_sheet_name_schedule_date_key
  UNIQUE (sheet_name, schedule_date);
