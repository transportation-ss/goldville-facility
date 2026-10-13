-- Migration 064: 試算沙盒「環境」（每個環境＝一份完整試算模型 JSON：變數/項目/事件）
-- 衍生環境採「複製後獨立」，derived_from 只作紀錄，不做繼承

CREATE TABLE public.sim_environments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  notes         text,
  model         jsonb NOT NULL,
  derived_from  uuid REFERENCES public.sim_environments(id) ON DELETE SET NULL,
  derived_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id)
);

ALTER TABLE public.sim_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting manage sim environments" ON public.sim_environments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));
