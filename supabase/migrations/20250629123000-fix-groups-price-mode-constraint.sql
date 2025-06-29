
-- Fix the groups table price_mode check constraint
-- The constraint was likely too restrictive

-- Drop the existing constraint
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_price_mode_check;

-- Add a more flexible constraint that allows the current data structure
ALTER TABLE public.groups ADD CONSTRAINT groups_price_mode_check 
CHECK (
  (price_mode = 'perSession' AND price_per_session > 0) OR
  (price_mode = 'total' AND total_price > 0)
);

-- Also ensure that the price fields can handle the data properly
-- Make sure price_per_session can be NULL when using total pricing
ALTER TABLE public.groups ALTER COLUMN price_per_session DROP NOT NULL;
