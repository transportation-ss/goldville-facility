-- Migration 011: 大夜班簽到欄位（3 個簽到槽）
ALTER TABLE public.nightshift_sessions
  ADD COLUMN IF NOT EXISTS signin_1_name text,
  ADD COLUMN IF NOT EXISTS signin_1_at   timestamptz,
  ADD COLUMN IF NOT EXISTS signin_2_name text,
  ADD COLUMN IF NOT EXISTS signin_2_at   timestamptz,
  ADD COLUMN IF NOT EXISTS signin_3_name text,
  ADD COLUMN IF NOT EXISTS signin_3_at   timestamptz;
