
-- Add individual social media columns to users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS viber text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skype text;  
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS zoom text;

-- Remove the old socials JSONB column if it exists since we're using individual columns now
ALTER TABLE public.users DROP COLUMN IF EXISTS socials;
