-- 0) Sanity: make sure the function exists
-- \df+ public.rpc_load_event_config

-- 1) Set the function owner to a powerful role (usually "postgres" in Supabase)
ALTER FUNCTION public.rpc_load_event_config(text) OWNER TO postgres;

-- 2) (Defense-in-depth) Ensure the function has a fixed search_path (already in the CREATE, but enforce anyway)
-- If you need to rewrite: CREATE OR REPLACE FUNCTION ... SECURITY DEFINER SET search_path = public ...

-- 3) Revoke broad execute; then grant narrowly
REVOKE ALL ON FUNCTION public.rpc_load_event_config(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_load_event_config(text) TO anon, authenticated;

-- 4) Deny direct reads on the public views if you want RPC-only access
REVOKE SELECT ON
  public.v_event_config_public,
  public.v_divisions_public,
  public.v_packages_public,
  public.v_race_day_items_public,
  public.v_practice_items_public,
  public.v_timeslots_public,
  public.v_ui_texts_public
FROM PUBLIC, anon, authenticated;

-- 5) Enable RLS on base tables (if not already) and ensure there are no permissive policies
-- (Views don’t have RLS; base tables do. The postgres owner bypasses RLS when executing the function.)
ALTER TABLE public.annual_event_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_event_division_map      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.division_config_general        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_event_order_item_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeslot_catalog               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_texts                       ENABLE ROW LEVEL SECURITY;

-- Optional: explicitly deny table reads to non-owners via RLS policies (example pattern)
-- CREATE POLICY deny_all ON public.annual_event_config FOR SELECT USING (false);
-- (Repeat per base table as needed.)
