-- 在 hardware_items 加上 tags 欄位
ALTER TABLE public.hardware_items ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.hardware_items ADD COLUMN IF NOT EXISTS item_group text;

-- 硬體維修說明（一對多）
CREATE TABLE public.hardware_issues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_id uuid NOT NULL REFERENCES public.hardware_items(id) ON DELETE CASCADE,
  issue_desc  text,
  repair_method text,
  vendor_phone  text,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.hardware_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_select ON public.hardware_issues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY allow_all ON public.hardware_issues
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('technician','manager','admin')
    )
  );