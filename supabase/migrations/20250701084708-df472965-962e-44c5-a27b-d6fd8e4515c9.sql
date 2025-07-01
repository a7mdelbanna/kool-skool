
-- Add new columns to students table for enhanced profile information
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS telegram TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.students.birthday IS 'Student birthday (optional)';
COMMENT ON COLUMN public.students.whatsapp IS 'Student WhatsApp contact (optional)';
COMMENT ON COLUMN public.students.telegram IS 'Student Telegram contact (optional)';
COMMENT ON COLUMN public.students.instagram IS 'Student Instagram handle (optional)';
