-- Migration 067: 服務模組新增「運動」(exercise)、「活動」(activity)
-- 040 建立 category CHECK 時未指定名稱，先動態找出舊 constraint 再重建。

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname IN ('butler_tasks', 'butler_service_logs')
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.butler_tasks
  ADD CONSTRAINT butler_tasks_category_check
  CHECK (category IN ('medication', 'cleaning', 'companion', 'exercise', 'activity', 'other'));

ALTER TABLE public.butler_service_logs
  ADD CONSTRAINT butler_service_logs_category_check
  CHECK (category IN ('medication', 'cleaning', 'companion', 'exercise', 'activity', 'other'));
