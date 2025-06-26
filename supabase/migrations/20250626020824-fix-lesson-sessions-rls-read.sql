
-- Fix RLS policies for lesson_sessions to allow reading sessions for users in the same school

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "lesson_sessions_select_policy" ON public.lesson_sessions;
DROP POLICY IF EXISTS "lesson_sessions_insert_policy" ON public.lesson_sessions;
DROP POLICY IF EXISTS "lesson_sessions_update_policy" ON public.lesson_sessions;

-- Enable RLS
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Allow users to see lesson sessions for students in their school
CREATE POLICY "lesson_sessions_select_policy" ON public.lesson_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = lesson_sessions.student_id 
    AND s.school_id = u.school_id
  )
);

-- Policy for INSERT: Allow admins and teachers to create lesson sessions for students in their school
CREATE POLICY "lesson_sessions_insert_policy" ON public.lesson_sessions
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
CREATE POLICY "lesson_sessions_update_policy" ON public.lesson_sessions
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
CREATE POLICY "lesson_sessions_delete_policy" ON public.lesson_sessions
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
