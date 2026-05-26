-- Migration 010: 班次結束時間
ALTER TABLE public.nightshift_sessions
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;
