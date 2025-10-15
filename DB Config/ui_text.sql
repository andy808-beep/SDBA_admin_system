-- ============================================
-- UI Texts (i18n) + public view
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Table
CREATE TABLE IF NOT EXISTS public.ui_texts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_short_ref text    NOT NULL,                 -- e.g. 'TN2026'; can also use a wildcard like 'GLOBAL'
  screen          text    NOT NULL,                 -- e.g. 'p1_category', 'p2_teaminfo', 'p3_raceday', 'p4_booking', 'common'
  key             text    NOT NULL,                 -- e.g. 'title', 'subtitle', 'label_org_name', 'btn_next'
  text_en         text    NOT NULL,
  text_tc         text,
  sort_order      int     NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ui_text UNIQUE (event_short_ref, screen, key)
);

-- 1a) Add columns if table existed without them (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ui_texts' AND column_name='sort_order'
  ) THEN
    ALTER TABLE public.ui_texts ADD COLUMN sort_order int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ui_texts' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.ui_texts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='ui_texts' AND constraint_name='uq_ui_text'
  ) THEN
    ALTER TABLE public.ui_texts
      ADD CONSTRAINT uq_ui_text UNIQUE (event_short_ref, screen, key);
  END IF;
END $$;

-- 1b) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ui_texts_updated_at ON public.ui_texts;
CREATE TRIGGER trg_ui_texts_updated_at
BEFORE UPDATE ON public.ui_texts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_ui_texts_event    ON public.ui_texts(event_short_ref);
CREATE INDEX IF NOT EXISTS idx_ui_texts_screen   ON public.ui_texts(screen);
CREATE INDEX IF NOT EXISTS idx_ui_texts_active   ON public.ui_texts(is_active, sort_order);

-- 3) Seed (minimal examples you can extend)
-- Tip: keep screen/key stable; change only text values per event.
INSERT INTO public.ui_texts (event_short_ref, screen, key, text_en, text_tc, sort_order)
VALUES
-- Common buttons
('TN2025','common','btn_back','Back','返回',10),
('TN2025','common','btn_next','Next','下一步',20),

-- Page 1: Category
('TN2025','p1_category','title','Select Race Category','選擇參賽組別',10),
('TN2025','p1_category','entry_options','Entry Options','報名選項',20),
('TN2025','p1_category','teams_label','How many teams?','隊伍數量',30),

-- Page 2: Team info
('TN2025','p2_teaminfo','title','Team & Organization Info','隊伍及機構資料',10),
('TN2025','p2_teaminfo','label_org_name','Organization / Group Name','機構 / 團體名稱',20),
('TN2025','p2_teaminfo','label_address','Mailing Address','通訊地址',30),

-- Page 3: Race-day
('TN2025','p3_raceday','title','Race-Day Arrangements','比賽日安排',10),

-- Page 4: Booking
('TN2025','p4_booking','title','Practice Booking','練習預約',10),
('TN2025','p4_booking','window_hint','Practice window: Jan–Jul (from config)','練習時段：一月至七月（由設定提供）',20)
ON CONFLICT (event_short_ref, screen, key) DO UPDATE
SET text_en   = EXCLUDED.text_en,
    text_tc   = EXCLUDED.text_tc,
    sort_order= EXCLUDED.sort_order,
    is_active = true;

-- 4) Public view (read-only for client)
-- Exposes only non-sensitive, active rows; client can filter by event_short_ref.
CREATE OR REPLACE VIEW public.v_ui_texts_public
AS
SELECT event_short_ref, screen, key, text_en, text_tc, sort_order
FROM public.ui_texts
WHERE is_active = true;

-- (Optional) You can GRANT anon SELECT on the view while keeping RLS on the base table.
-- Example (Supabase):
-- alter table public.ui_texts enable row level security;
-- create policy "ui_texts_read_admin_only" on public.ui_texts
--   for select using (false);  -- deny direct table reads
-- grant select on public.v_ui_texts_public to anon, authenticated;
