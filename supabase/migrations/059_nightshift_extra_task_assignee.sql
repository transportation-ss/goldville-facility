-- ==========================================
-- Migration 059: 大夜班加派任務可指定對象
-- ==========================================

ALTER TABLE nightshift_extra_tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.user_profiles(id);

CREATE INDEX IF NOT EXISTS idx_nightshift_extra_tasks_assigned_to
  ON nightshift_extra_tasks(assigned_to);
