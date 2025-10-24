-- Add unique constraint on (event_short_ref, client_tx_id) to prevent duplicate submissions
-- This ensures idempotency for form submissions

-- First, add the client_tx_id column if it doesn't exist
ALTER TABLE public.registration_meta 
ADD COLUMN IF NOT EXISTS client_tx_id text;

-- Add unique constraint to prevent duplicate submissions
ALTER TABLE public.registration_meta 
ADD CONSTRAINT uniq_registration_client_tx 
UNIQUE (event_short_ref, client_tx_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_registration_meta_client_tx 
ON public.registration_meta (event_short_ref, client_tx_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT uniq_registration_client_tx ON public.registration_meta 
IS 'Ensures idempotency: same client_tx_id + event_short_ref cannot be submitted twice';
