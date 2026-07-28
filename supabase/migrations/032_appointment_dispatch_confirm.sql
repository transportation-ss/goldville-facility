-- Migration 032: 回診協調 - 管家確認派車欄位

ALTER TABLE public.appointment_cases
  ADD COLUMN dispatched_by_line_id text,
  ADD COLUMN dispatched_at         timestamptz;
