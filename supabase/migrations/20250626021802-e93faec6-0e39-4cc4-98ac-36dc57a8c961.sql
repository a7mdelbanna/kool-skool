
-- First, let's check if RLS is enabled and drop any existing policies
DROP POLICY IF EXISTS "lesson_sessions_select_policy" ON public.lesson_sessions;
DROP POLICY IF EXISTS "lesson_sessions_insert_policy" ON public.lesson_sessions;
DROP POLICY IF EXISTS "lesson_sessions_update_policy" ON public.lesson_sessions;
DROP POLICY IF EXISTS "lesson_sessions_delete_policy" ON public.lesson_sessions;

-- Enable RLS on lesson_sessions table
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to get current user's school_id
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$$;

-- Policy for SELECT: Allow users to see lesson sessions for students in their school
CREATE POLICY "Users can view lesson sessions in their school" ON public.lesson_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = lesson_sessions.student_id 
    AND s.school_id = public.get_current_user_school_id()
  )
);

-- Policy for INSERT: Allow admins and teachers to create lesson sessions for students in their school
CREATE POLICY "Admins and teachers can create lesson sessions" ON public.lesson_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE u.id = auth.uid()
    AND u.school_id = s.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy for UPDATE: Allow admins and teachers to update lesson sessions for students in their school
CREATE POLICY "Admins and teachers can update lesson sessions" ON public.lesson_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE u.id = auth.uid()
    AND u.school_id = s.school_id
    AND u.role IN ('admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE u.id = auth.uid()
    AND u.school_id = s.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy for DELETE: Allow admins and teachers to delete lesson sessions for students in their school
CREATE POLICY "Admins and teachers can delete lesson sessions" ON public.lesson_sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE u.id = auth.uid()
    AND u.school_id = s.school_id
    AND u.role IN ('admin', 'teacher')
  )
);
