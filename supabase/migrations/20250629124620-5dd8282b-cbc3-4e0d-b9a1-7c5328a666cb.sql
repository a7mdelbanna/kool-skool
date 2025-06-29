
-- Final fix for the groups table price_mode check constraint
-- Allow NULL price_per_session when using total pricing mode

-- Drop the existing constraint
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_price_mode_check;

-- Add a properly flexible constraint
ALTER TABLE public.groups ADD CONSTRAINT groups_price_mode_check 
CHECK (
  (price_mode = 'perSession' AND price_per_session IS NOT NULL AND price_per_session > 0) OR
  (price_mode = 'total' AND total_price IS NOT NULL AND total_price > 0)
);

-- Ensure that price_per_session can be NULL when using total pricing
ALTER TABLE public.groups ALTER COLUMN price_per_session DROP NOT NULL;
