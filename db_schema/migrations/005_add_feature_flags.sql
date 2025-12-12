-- db_schema/migrations/005_add_feature_flags.sql
-- Date: 2025-01-01
-- Description: Add feature flags system for runtime feature toggling

BEGIN;

-- =========================================================
-- FEATURE FLAGS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  flag_name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  enabled_for_users uuid[] DEFAULT ARRAY[]::uuid[], -- Specific user IDs that have this flag enabled
  enabled_for_emails text[] DEFAULT ARRAY[]::text[], -- Specific emails that have this flag enabled
  metadata jsonb DEFAULT '{}'::jsonb, -- Additional metadata (e.g., rollout strategy, A/B test info)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT flag_key_format CHECK (flag_key ~ '^[A-Z_][A-Z0-9_]*$') -- UPPER_SNAKE_CASE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags (flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags (enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_at ON public.feature_flags (updated_at);

-- =========================================================
-- FEATURE FLAG AUDIT LOG
-- =========================================================
CREATE TABLE IF NOT EXISTS public.feature_flag_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('enabled', 'disabled', 'updated', 'rollout_changed', 'user_added', 'user_removed')),
  old_value jsonb,
  new_value jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_id ON public.feature_flag_audit (flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_key ON public.feature_flag_audit (flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_changed_at ON public.feature_flag_audit (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_changed_by ON public.feature_flag_audit (changed_by);

-- =========================================================
-- TRIGGER: Update updated_at timestamp
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_feature_flag_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF row(new.*) IS DISTINCT FROM row(old.*) THEN
    new.updated_at := now();
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.set_feature_flag_updated_at();

-- =========================================================
-- FUNCTION: Check if feature flag is enabled for user
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_flag_key text,
  p_user_id uuid DEFAULT NULL,
  p_user_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_flag public.feature_flags%ROWTYPE;
  v_user_hash int;
  v_rollout_hash int;
BEGIN
  -- Get the feature flag
  SELECT * INTO v_flag
  FROM public.feature_flags
  WHERE flag_key = p_flag_key;
  
  -- Flag doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Flag is globally disabled
  IF NOT v_flag.enabled THEN
    RETURN false;
  END IF;
  
  -- Check if user is in explicit allow list
  IF p_user_id IS NOT NULL AND p_user_id = ANY(v_flag.enabled_for_users) THEN
    RETURN true;
  END IF;
  
  IF p_user_email IS NOT NULL AND p_user_email = ANY(v_flag.enabled_for_emails) THEN
    RETURN true;
  END IF;
  
  -- Check rollout percentage using consistent hashing
  IF v_flag.rollout_percentage < 100 AND p_user_id IS NOT NULL THEN
    -- Use user_id for consistent hashing (same user always gets same result)
    v_user_hash := abs(hashtext(p_user_id::text)) % 100;
    v_rollout_hash := v_flag.rollout_percentage;
    
    IF v_user_hash >= v_rollout_hash THEN
      RETURN false;
    END IF;
  END IF;
  
  -- If rollout is 100% or user passes hash check
  RETURN true;
END;
$$;

-- =========================================================
-- FUNCTION: Log feature flag change
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_feature_flag_change(
  p_flag_id uuid,
  p_flag_key text,
  p_action text,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.feature_flag_audit (
    flag_id,
    flag_key,
    action,
    old_value,
    new_value,
    changed_by,
    notes
  ) VALUES (
    p_flag_id,
    p_flag_key,
    p_action,
    p_old_value,
    p_new_value,
    p_changed_by,
    p_notes
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- =========================================================
-- INITIAL FEATURE FLAGS
-- =========================================================
INSERT INTO public.feature_flags (flag_key, flag_name, description, enabled, rollout_percentage) VALUES
  ('ENABLE_RATE_LIMITING', 'Rate Limiting', 'Enable rate limiting for API endpoints', true, 100),
  ('ENABLE_EMAIL_NOTIFICATIONS', 'Email Notifications', 'Send email notifications for registration events', false, 0),
  ('ENABLE_ADVANCED_FILTERING', 'Advanced Filtering', 'Enable advanced filtering options in admin dashboard', false, 0),
  ('ENABLE_BULK_OPERATIONS', 'Bulk Operations', 'Enable bulk approve/reject operations', false, 0),
  ('NEW_DASHBOARD_DESIGN', 'New Dashboard Design', 'Enable new dashboard design (beta)', false, 10)
ON CONFLICT (flag_key) DO NOTHING;

-- Record migration
INSERT INTO public.schema_migrations (version, description)
VALUES ('005_add_feature_flags', 'Add feature flags system for runtime feature toggling')
ON CONFLICT (version) DO NOTHING;

COMMIT;

