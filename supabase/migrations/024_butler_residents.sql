-- Migration 024: 管家住戶 + 服務日誌

-- ── 住戶資料 ──────────────────────────────────────────────
CREATE TABLE public.butler_residents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  room              text,
  status            text NOT NULL DEFAULT 'active_resident'
                    CHECK (status IN ('active_resident', 'service_only', 'inactive')),
  move_in_date      date,
  move_out_date     date,
  drive_folder_id   text,            -- Google Drive 根資料夾 ID
  drive_folder_url  text,            -- 給管家快速開啟的連結
  notes             text,
  created_by        uuid REFERENCES public.user_profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_br_status ON public.butler_residents(status);

ALTER TABLE public.butler_residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取住戶" ON public.butler_residents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理住戶" ON public.butler_residents
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  );

-- ── 服務日誌 ──────────────────────────────────────────────
CREATE TABLE public.butler_service_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   uuid NOT NULL REFERENCES public.butler_residents(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES public.user_profiles(id),
  log_date      date NOT NULL DEFAULT CURRENT_DATE,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  period_type   text NOT NULL DEFAULT 'day'
                CHECK (period_type IN ('day', 'month', 'quarter', 'year')),
  title         text NOT NULL,       -- 例：陳小明_服務紀錄_20260525-20260625
  content       jsonb NOT NULL DEFAULT '[]',  -- block 陣列
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bsl_resident ON public.butler_service_logs(resident_id, log_date DESC);
CREATE INDEX idx_bsl_author   ON public.butler_service_logs(author_id);

ALTER TABLE public.butler_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取服務日誌" ON public.butler_service_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "登入者可建立日誌" ON public.butler_service_logs
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "作者和主管可編輯日誌" ON public.butler_service_logs
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  )
  WITH CHECK (true);

CREATE POLICY "管家主管可刪除日誌" ON public.butler_service_logs
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  );
