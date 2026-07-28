-- Migration 033: 回診協調 - 接單時間欄位（不影響 status，僅記錄最後一次成功接單的時間戳）

ALTER TABLE public.appointment_cases
  ADD COLUMN claimed_by_line_id text,
  ADD COLUMN claimed_at         timestamptz;
