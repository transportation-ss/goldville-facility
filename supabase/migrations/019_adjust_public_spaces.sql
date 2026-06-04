-- Migration 019: 公共空間調整
-- 1. 電梯間全部移除
-- 2. 各樓層新增廁所，移除健身房廁所/大廳廁所
-- 3. 書店大廳+旅店大廳 → 大廳
-- 4. 棋藝室A+B → 棋藝室
-- 5. 貴賓室+儲藏室 → 貴賓／儲藏室
-- 6+7. B1 新增 A側樓梯間、B側樓梯間
-- 8. 大會議室 → 大會議室／天井
-- 9. 移除 B側餐廳、雜貨店

-- ── 1. 移除所有電梯間 ────────────────────────────────────
DELETE FROM public.rooms
WHERE room_type = '公共區'
  AND name IN ('A側電梯間', 'B側電梯間', 'A側電梯', 'B側電梯');

-- ── 2. 移除舊廁所，新增各樓層廁所 ────────────────────────
DELETE FROM public.rooms
WHERE room_type = '公共區'
  AND name IN ('健身房廁所', '大廳廁所');

INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('廁所', 'B1', '公共區', -100),
  ('廁所', '1F', '公共區', 1012),
  ('廁所', '2F', '公共區', 2005),
  ('廁所', '3F', '公共區', 3005),
  ('廁所', '5F', '公共區', 5005),
  ('廁所', '6F', '公共區', 6005),
  ('廁所', '7F', '公共區', 7005);

-- ── 3. 書店大廳 + 旅店大廳 → 大廳 ────────────────────────
DELETE FROM public.rooms
WHERE room_type = '公共區'
  AND name IN ('書店大廳', '旅店大廳');

INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('大廳', '1F', '公共區', 1005);

-- ── 4. 棋藝室A + 棋藝室B → 棋藝室 ───────────────────────
DELETE FROM public.rooms
WHERE room_type = '公共區'
  AND name IN ('棋藝室A', '棋藝室B');

INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('棋藝室', 'B1', '公共區', -105);

-- ── 5. 貴賓室 + 儲藏室 → 貴賓／儲藏室 ───────────────────
DELETE FROM public.rooms
WHERE room_type = '公共區'
  AND name IN ('貴賓室', '儲藏室');

INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('貴賓／儲藏室', 'B1', '公共區', -101);

-- ── 6+7. B1 新增 A側樓梯間、B側樓梯間 ───────────────────
INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('A側樓梯間', 'B1', '公共區', -99),
  ('B側樓梯間', 'B1', '公共區', -98);

-- ── 8. 大會議室 → 大會議室／天井 ─────────────────────────
UPDATE public.rooms
SET name = '大會議室／天井'
WHERE room_type = '公共區'
  AND name = '大會議室'
  AND floor = 'B1';

-- ── 9. 移除 B側餐廳、雜貨店 ──────────────────────────────
DELETE FROM public.rooms
WHERE room_type = '公共區'
  AND floor = '1F'
  AND name IN ('B側餐廳', '雜貨店');
