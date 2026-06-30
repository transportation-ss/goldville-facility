-- Migration 027: 住戶清單調整
-- 1. 新增暱稱欄位
-- 2. status 新增「空房」分類
-- 3. 服務日誌週期改為 日/週/月/自訂
-- 4. 已知空房佔位建檔

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS nickname text;

ALTER TABLE public.butler_residents
  DROP CONSTRAINT IF EXISTS butler_residents_status_check;
ALTER TABLE public.butler_residents
  ADD CONSTRAINT butler_residents_status_check
  CHECK (status IN ('active_resident', 'service_only', 'inactive', 'vacant'));

ALTER TABLE public.butler_service_logs
  DROP CONSTRAINT IF EXISTS butler_service_logs_period_type_check;
ALTER TABLE public.butler_service_logs
  ADD CONSTRAINT butler_service_logs_period_type_check
  CHECK (period_type IN ('day', 'week', 'month', 'custom'));

-- 已知空房佔位（之後有人入住，直接編輯這筆資料即可）
INSERT INTO public.butler_residents (name, room, status)
VALUES
  ('(空房)', '302', 'vacant'),
  ('(空房)', '303', 'vacant'),
  ('(空房)', '305', 'vacant'),
  ('(空房)', '308', 'vacant'),
  ('(空房)', '309', 'vacant'),
  ('(空房)', '310', 'vacant'),
  ('(空房)', '311', 'vacant'),
  ('(空房)', '313', 'vacant'),
  ('(空房)', '315', 'vacant'),
  ('(空房)', '503', 'vacant'),
  ('(空房)', '505', 'vacant'),
  ('(空房)', '708', 'vacant');
