-- Migration 012: 管理員重新開啟紀錄欄位
ALTER TABLE public.nightshift_sessions
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz;
