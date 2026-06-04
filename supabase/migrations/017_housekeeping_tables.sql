-- Migration 017: 房務派工系統
-- 1. 新增 housekeeping 身分（修改 role check constraint）
-- 2. 建立 housekeeping_daily_plans
-- 3. 建立 housekeeping_tasks
-- 4. 建立 housekeeping_adhoc_orders
-- 5. 建立 housekeeping_task_photos（預留）

-- ── 1. 更新 role check constraint ─────────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'admin', 'manager',
    'frontdesk_night', 'frontdesk_day',
    'technician', 'procurement',
    'housekeeper', 'housekeeping',
    'admin_staff', 'sales'
  ));

-- ── 2. 每日固定派工主單 ─────────────────────────────────
CREATE TABLE public.housekeeping_daily_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date     date NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'completed')),
  general_notes text,
  created_by    uuid REFERENCES public.user_profiles(id),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hdp_date ON public.housekeeping_daily_plans(plan_date DESC);

ALTER TABLE public.housekeeping_daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取派工主單" ON public.housekeeping_daily_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "日班及管理員可管理派工主單" ON public.housekeeping_daily_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'frontdesk_day')
    )
  );

-- ── 3. 固定派工任務 ───────────────────────────────────────
CREATE TABLE public.housekeeping_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES public.housekeeping_daily_plans(id) ON DELETE CASCADE,
  room_id       uuid REFERENCES public.rooms(id),
  task_type     text NOT NULL
                CHECK (task_type IN (
                  'checkout', 'stay_over', 'vacant', 'late_checkout',
                  'deep_clean', 'vip', 'dnd', 'extra_bed',
                  'maintenance_hold', 'routine', 'spot_clean'
                )),
  priority      text NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('urgent', 'normal')),
  special_notes text,
  assigned_to   uuid REFERENCES public.user_profiles(id),
  sort_order    int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_by  uuid REFERENCES public.user_profiles(id),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ht_plan_id ON public.housekeeping_tasks(plan_id);

ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取任務" ON public.housekeeping_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "日班及管理員可建立/編輯任務" ON public.housekeeping_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'frontdesk_day')
    )
  );

CREATE POLICY "所有人可完成任務" ON public.housekeeping_tasks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "日班及管理員可刪除任務" ON public.housekeeping_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'frontdesk_day')
    )
  );

-- ── 4. 臨時派工單（獨立，不影響固定單）──────────────────
CREATE TABLE public.housekeeping_adhoc_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date    date NOT NULL DEFAULT CURRENT_DATE,
  title         text NOT NULL,
  description   text,
  room_id       uuid REFERENCES public.rooms(id),
  task_type     text CHECK (task_type IN (
                  'checkout', 'stay_over', 'vacant', 'late_checkout',
                  'deep_clean', 'vip', 'dnd', 'extra_bed',
                  'maintenance_hold', 'routine', 'spot_clean'
                )),
  priority      text NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('urgent', 'normal')),
  assigned_to   uuid REFERENCES public.user_profiles(id),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'completed')),
  completed_by  uuid REFERENCES public.user_profiles(id),
  completed_at  timestamptz,
  created_by    uuid REFERENCES public.user_profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hao_date ON public.housekeeping_adhoc_orders(order_date DESC);

ALTER TABLE public.housekeeping_adhoc_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取臨時派工" ON public.housekeeping_adhoc_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "日班及管理員可建立臨時派工" ON public.housekeeping_adhoc_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'frontdesk_day')
    )
  );

CREATE POLICY "所有人可完成臨時派工" ON public.housekeeping_adhoc_orders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 5. 照片預留（Supabase Storage） ────────────────────────
CREATE TABLE public.housekeeping_task_photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        uuid REFERENCES public.housekeeping_tasks(id) ON DELETE CASCADE,
  adhoc_order_id uuid REFERENCES public.housekeeping_adhoc_orders(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,
  uploaded_by    uuid REFERENCES public.user_profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photo_must_have_parent
    CHECK (task_id IS NOT NULL OR adhoc_order_id IS NOT NULL)
);

ALTER TABLE public.housekeeping_task_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取照片" ON public.housekeeping_task_photos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "登入者可上傳照片" ON public.housekeeping_task_photos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
