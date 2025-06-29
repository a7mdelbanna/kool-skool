
-- Add course_id column to groups table
ALTER TABLE public.groups
ADD COLUMN course_id uuid REFERENCES public.courses(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_groups_course_id ON
public.groups(course_id);
