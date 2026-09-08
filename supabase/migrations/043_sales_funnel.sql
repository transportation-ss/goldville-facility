-- Migration 043: 業務板塊 — 電訪/來電/參觀/試住 每日統計表
-- 資料來源：Google Sheet「客服來電數統計」CSV 同步（手動按鈕觸發，非自動 cron）

CREATE TABLE public.sales_funnel_entries (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date            date NOT NULL UNIQUE,
  call_in_count         int NOT NULL DEFAULT 0,  -- 來電/walkin 總數
  callback_visit_count  int NOT NULL DEFAULT 0,  -- 回電/參觀追蹤 總數
  visit_count           int NOT NULL DEFAULT 0,  -- 參觀
  trial_stay_count      int NOT NULL DEFAULT 0,  -- 試住
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_funnel_entries_date ON public.sales_funnel_entries(entry_date DESC);

CREATE TRIGGER trg_sales_funnel_entries_updated_at
  BEFORE UPDATE ON public.sales_funnel_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sales_funnel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理員與業務可讀取業務統計" ON public.sales_funnel_entries
  FOR SELECT USING (public.get_my_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "管理員與業務可寫入業務統計" ON public.sales_funnel_entries
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "管理員與業務可更新業務統計" ON public.sales_funnel_entries
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'manager', 'sales'));
