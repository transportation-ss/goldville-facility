-- Migration 060: 住戶交通報表別名（讓管理者自行維護，取代原本寫死的 scripts/alias_mapping.json）

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS transport_aliases text[] NOT NULL DEFAULT '{}';
