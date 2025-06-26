
-- Temporarily disable RLS on lesson_sessions table since the app uses custom auth
-- This allows the RPC function to work properly
ALTER TABLE public.lesson_sessions DISABLE ROW LEVEL SECURITY;

-- Drop the problematic policies that depend on auth.uid()
DROP POLICY IF EXISTS "Users can view lesson sessions in their school" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Admins and teachers can create lesson sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Admins and teachers can update lesson sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Admins and teachers can delete lesson sessions" ON public.lesson_sessions;

-- Drop the helper function that won't work without Supabase Auth
DROP FUNCTION IF EXISTS public.get_current_user_school_id();
