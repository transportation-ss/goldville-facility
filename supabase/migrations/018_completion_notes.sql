-- 完成備註欄位
ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE housekeeping_adhoc_orders
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;
