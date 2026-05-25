-- ============================================================
-- Migration 003: 客房資料 + 房間盤點（含版本歷史）
-- 執行時間：2025-05-25
-- 設計說明：
--   每筆 room_inventory 是一個「快照」
--   is_initial = true  → 初始狀態（政府申報基準）
--   最新一筆           → 目前狀態
--   比對兩筆可得「變動內容」→ 政府申報變動用
-- ============================================================

-- 1. 建立房間盤點快照表
CREATE TABLE public.room_inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,

  -- 快照 metadata
  snapshot_date   date NOT NULL DEFAULT CURRENT_DATE,
  is_initial      boolean NOT NULL DEFAULT false,  -- 是否為初始狀態
  change_reason   text,                            -- 變動原因（申報用）

  -- 床型
  bed_type        text CHECK (bed_type IN ('雙人床', '雙單人床', '單人床', '合併一大床')),

  -- 設備清單
  wardrobe            boolean,           -- 衣櫃
  fridge_size         text CHECK (fridge_size IN ('大', '小', '無')),  -- 冰箱
  sofa_type           text CHECK (sofa_type IN ('無', '沙發床', '一般沙發')),  -- 沙發
  washer              boolean,           -- 洗衣機
  ac_count            int,               -- 冷氣機台數
  has_accessible      boolean,           -- 無障礙設施
  accessible_notes    text,              -- 無障礙說明
  tv_count            int,               -- 電視台數
  dresser_6drawer     boolean,           -- 六斗櫃
  bedside_table_count int,               -- 床頭小櫃數量
  headboard_type      text CHECK (headboard_type IN ('收納型', '一般型')),  -- 床頭型
  kettle              boolean,           -- 熱水瓶
  desk                boolean,           -- 書桌
  chair_count         int,               -- 座椅數量
  trash_bin_count     int,               -- 垃圾桶數量
  drying_rack         boolean,           -- 曬衣架

  notes           text,                  -- 其他備註
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.user_profiles(id)
);

-- 每房只能有一筆 is_initial = true 的記錄
CREATE UNIQUE INDEX room_inventory_initial_unique
  ON public.room_inventory(room_id)
  WHERE is_initial = true;

-- 查詢效能索引
CREATE INDEX idx_room_inventory_room_date
  ON public.room_inventory(room_id, snapshot_date DESC);

-- RLS
ALTER TABLE public.room_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有登入者可讀取盤點" ON public.room_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "technician 以上可管理盤點" ON public.room_inventory
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('technician', 'manager', 'admin')
    )
  );

-- ============================================================
-- 2. 新增所有客房（跳過 xx04、xx14 結尾房號）
-- ============================================================

-- 2F（201-216，跳過 204、214）
INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('201', '2F', '客房', 201), ('202', '2F', '客房', 202), ('203', '2F', '客房', 203),
  ('205', '2F', '客房', 205), ('206', '2F', '客房', 206), ('207', '2F', '客房', 207),
  ('208', '2F', '客房', 208), ('209', '2F', '客房', 209), ('210', '2F', '客房', 210),
  ('211', '2F', '客房', 211), ('212', '2F', '客房', 212), ('213', '2F', '客房', 213),
  ('215', '2F', '客房', 215), ('216', '2F', '客房', 216);

-- 3F（301-316，跳過 304、314）
INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('301', '3F', '客房', 301), ('302', '3F', '客房', 302), ('303', '3F', '客房', 303),
  ('305', '3F', '客房', 305), ('306', '3F', '客房', 306), ('307', '3F', '客房', 307),
  ('308', '3F', '客房', 308), ('309', '3F', '客房', 309), ('310', '3F', '客房', 310),
  ('311', '3F', '客房', 311), ('312', '3F', '客房', 312), ('313', '3F', '客房', 313),
  ('315', '3F', '客房', 315), ('316', '3F', '客房', 316);

-- 5F（501-515，跳過 504、514）
INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('501', '5F', '客房', 501), ('502', '5F', '客房', 502), ('503', '5F', '客房', 503),
  ('505', '5F', '客房', 505), ('506', '5F', '客房', 506), ('507', '5F', '客房', 507),
  ('508', '5F', '客房', 508), ('509', '5F', '客房', 509), ('510', '5F', '客房', 510),
  ('511', '5F', '客房', 511), ('512', '5F', '客房', 512), ('513', '5F', '客房', 513),
  ('515', '5F', '客房', 515);

-- 6F（601-615，跳過 604、614）
INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('601', '6F', '客房', 601), ('602', '6F', '客房', 602), ('603', '6F', '客房', 603),
  ('605', '6F', '客房', 605), ('606', '6F', '客房', 606), ('607', '6F', '客房', 607),
  ('608', '6F', '客房', 608), ('609', '6F', '客房', 609), ('610', '6F', '客房', 610),
  ('611', '6F', '客房', 611), ('612', '6F', '客房', 612), ('613', '6F', '客房', 613),
  ('615', '6F', '客房', 615);

-- 7F（701-715，跳過 704、714）
INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('701', '7F', '客房', 701), ('702', '7F', '客房', 702), ('703', '7F', '客房', 703),
  ('705', '7F', '客房', 705), ('706', '7F', '客房', 706), ('707', '7F', '客房', 707),
  ('708', '7F', '客房', 708), ('709', '7F', '客房', 709), ('710', '7F', '客房', 710),
  ('711', '7F', '客房', 711), ('712', '7F', '客房', 712), ('713', '7F', '客房', 713),
  ('715', '7F', '客房', 715);
