-- Migration 055：核心成員房間依樓層有不同固定價，非全館單一 core_member_low
-- 2F 07、10房：36,000；6F 15房：30,000

ALTER TABLE public.room_rate_overrides
  ADD COLUMN core_member_price numeric;

INSERT INTO public.room_rate_overrides (room_name, core_member_price, note) VALUES
  ('207', 36000, '核心成員-2F（07、10房）'),
  ('210', 36000, '核心成員-2F（07、10房）'),
  ('615', 30000, '核心成員-6F（15房）')
ON CONFLICT (room_name) DO UPDATE SET
  core_member_price = EXCLUDED.core_member_price,
  note = EXCLUDED.note;
