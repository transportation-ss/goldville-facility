-- 修正 23:00 任務名稱：「貼紙、交班」→「點錢、交班」
UPDATE public.nightshift_task_templates
SET title = '點錢、交班'
WHERE title = '貼紙、交班'
  AND time_slot = '23:00';
