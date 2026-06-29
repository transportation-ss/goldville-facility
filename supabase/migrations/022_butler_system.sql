-- Migration 022: 管家系統
-- 1. 新增 butler_manager / butler 角色
-- 2. 建立 butler_tasks（派工任務）
-- 3. 建立 butler_schedules（班表）

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
    'tech_housekeeping',
    'butler_manager', 'butler',
    'admin_staff', 'sales',
    'nightshift', 'frontdesk', 'reporter'
  ));

-- ── 2. 管家任務 ────────────────────────────────────────────
CREATE TABLE public.butler_tasks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_date            date NOT NULL,
  start_time           time,                          -- HH:MM，選填（全日任務可為 null）
  duration_minutes     int CHECK (duration_minutes > 0),  -- 30 的倍數
  space                text,                          -- 空間/位置，選填，以住戶為單位
  title                text NOT NULL,                 -- 工作內容
  notes                text,                          -- 備注
  assigned_to          uuid REFERENCES public.user_profiles(id),
  priority             text NOT NULL DEFAULT 'normal'
                       CHECK (priority IN ('normal', 'urgent')),
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'in_progress', 'completed')),
  completion_notes     text,
  completion_photo_url text,                          -- 預留
  created_by           uuid REFERENCES public.user_profiles(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bt_date    ON public.butler_tasks(task_date DESC);
CREATE INDEX idx_bt_staff   ON public.butler_tasks(assigned_to);
CREATE INDEX idx_bt_status  ON public.butler_tasks(status);

ALTER TABLE public.butler_tasks ENABLE ROW LEVEL SECURITY;

-- 所有登入者可讀（管家需看自己的任務）
CREATE POLICY "登入者可讀取管家任務" ON public.butler_tasks
  FOR SELECT TO authenticated USING (true);

-- 管家主管/管理員可建立任務
CREATE POLICY "管家主管可建立任務" ON public.butler_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'butler_manager')
    )
  );

-- 管家主管/管理員可編輯任務；所有人可更新自己任務的狀態/備注
CREATE POLICY "管家主管可編輯任務" ON public.butler_tasks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 管家主管/管理員可刪除任務
CREATE POLICY "管家主管可刪除任務" ON public.butler_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'butler_manager')
    )
  );

-- ── 3. 班表 ────────────────────────────────────────────────
CREATE TABLE public.butler_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  shift_start   time,
  shift_end     time,
  is_day_off    boolean NOT NULL DEFAULT false,
  notes         text,
  created_by    uuid REFERENCES public.user_profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, schedule_date)
);

CREATE INDEX idx_bs_date  ON public.butler_schedules(schedule_date DESC);
CREATE INDEX idx_bs_staff ON public.butler_schedules(staff_id);

ALTER TABLE public.butler_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取班表" ON public.butler_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理班表" ON public.butler_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'butler_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'butler_manager')
    )
  );
