
-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "School members can view student subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "School admins and teachers can insert student subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "School admins and teachers can update student subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "School admins and teachers can delete student subscriptions" ON public.subscriptions;

DROP POLICY IF EXISTS "School members can view student sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "School admins and teachers can insert student sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "School admins and teachers can update student sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "School admins and teachers can delete student sessions" ON public.lesson_sessions;

-- Create a security definer function to get current user's school_id and role
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(user_school_id UUID, user_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT school_id, role
  FROM public.users
  WHERE id = auth.uid();
END;
$$;

-- Create improved RLS policies for subscriptions
CREATE POLICY "School members can view subscriptions" ON public.subscriptions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = subscriptions.student_id
    WHERE s.school_id = ui.user_school_id
  )
);

CREATE POLICY "School admins and teachers can insert subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = subscriptions.student_id
    WHERE s.school_id = ui.user_school_id
    AND ui.user_role IN ('admin', 'teacher')
  )
);

CREATE POLICY "School admins and teachers can update subscriptions" ON public.subscriptions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = subscriptions.student_id
    WHERE s.school_id = ui.user_school_id
    AND ui.user_role IN ('admin', 'teacher')
  )
);

CREATE POLICY "School admins and teachers can delete subscriptions" ON public.subscriptions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = subscriptions.student_id
    WHERE s.school_id = ui.user_school_id
    AND ui.user_role IN ('admin', 'teacher')
  )
);

-- Create improved RLS policies for lesson_sessions
CREATE POLICY "School members can view lesson sessions" ON public.lesson_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE s.school_id = ui.user_school_id
  )
);

CREATE POLICY "School admins and teachers can insert lesson sessions" ON public.lesson_sessions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE s.school_id = ui.user_school_id
    AND ui.user_role IN ('admin', 'teacher')
  )
);

CREATE POLICY "School admins and teachers can update lesson sessions" ON public.lesson_sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE s.school_id = ui.user_school_id
    AND ui.user_role IN ('admin', 'teacher')
  )
);

CREATE POLICY "School admins and teachers can delete lesson sessions" ON public.lesson_sessions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_info() ui
    JOIN public.students s ON s.id = lesson_sessions.student_id
    WHERE s.school_id = ui.user_school_id
    AND ui.user_role IN ('admin', 'teacher')
  )
);
