
-- Ensure RLS is completely disabled on groups table and related tables
-- This migration will run regardless of current RLS state

-- Disable RLS on groups table
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies on groups table
DROP POLICY IF EXISTS "Users can view groups from their school" ON public.groups;
DROP POLICY IF EXISTS "Users can insert groups for their school" ON public.groups;
DROP POLICY IF EXISTS "Users can update groups from their school" ON public.groups;
DROP POLICY IF EXISTS "Users can delete groups from their school" ON public.groups;

-- Disable RLS on group_students table for consistency
ALTER TABLE public.group_students DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies on group_students table
DROP POLICY IF EXISTS "Users can view group students from their school" ON public.group_students;
DROP POLICY IF EXISTS "Users can insert group students for their school" ON public.group_students;
DROP POLICY IF EXISTS "Users can update group students from their school" ON public.group_students;
DROP POLICY IF EXISTS "Users can delete group students from their school" ON public.group_students;

-- Verify the groups table has all required columns
DO $$
BEGIN
    -- Check if course_id column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'groups' 
                   AND column_name = 'course_id') THEN
        ALTER TABLE public.groups ADD COLUMN course_id uuid REFERENCES public.courses(id);
        CREATE INDEX IF NOT EXISTS idx_groups_course_id ON public.groups(course_id);
    END IF;
END $$;
