
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view levels for their school" ON public.student_levels;
DROP POLICY IF EXISTS "Admins can insert levels for their school" ON public.student_levels;
DROP POLICY IF EXISTS "Admins can update levels for their school" ON public.student_levels;
DROP POLICY IF EXISTS "Admins can delete levels for their school" ON public.student_levels;

-- Temporarily disable RLS to allow the application to work with custom auth
ALTER TABLE public.student_levels DISABLE ROW LEVEL SECURITY;

-- Add a comment to document this decision
COMMENT ON TABLE public.student_levels IS 'RLS disabled - using application-level security with custom auth system';
