
-- Add dateOfBirth and socials columns to the users table
ALTER TABLE public.users 
ADD COLUMN date_of_birth DATE,
ADD COLUMN socials JSONB;

-- Add comment to clarify the socials column structure
COMMENT ON COLUMN public.users.socials IS 'JSON object containing social media platform usernames/links';
