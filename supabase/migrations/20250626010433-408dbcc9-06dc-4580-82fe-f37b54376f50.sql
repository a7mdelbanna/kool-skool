
-- First, drop all policies that depend on the security definer functions
DROP POLICY IF EXISTS "Users can view users in their school" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can view their school" ON public.schools;
DROP POLICY IF EXISTS "Users can view courses in their school" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view students in their school" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Users can view courses from their school" ON public.courses;
DROP POLICY IF EXISTS "Admins can create courses for their school" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses from their school" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses from their school" ON public.courses;
DROP POLICY IF EXISTS "Users can view team members in same school" ON public.users;
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in same school" ON public.users;

-- Now drop the security definer functions
DROP FUNCTION IF EXISTS public.get_current_user_school_id();
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create new security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Recreate essential policies for users table
CREATE POLICY "Users can view their own record" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can view team members in same school" 
  ON public.users 
  FOR SELECT 
  USING (
    school_id = public.get_current_user_school_id()
    AND role != 'student'
  );

CREATE POLICY "Admins can manage users in same school" 
  ON public.users 
  FOR ALL
  USING (
    public.get_current_user_role() = 'admin' 
    AND school_id = public.get_current_user_school_id()
  );

-- Recreate policies for other tables
CREATE POLICY "Users can view their school" 
  ON public.schools 
  FOR SELECT 
  USING (id = public.get_current_user_school_id());

CREATE POLICY "Users can view courses in their school" 
  ON public.courses 
  FOR SELECT 
  USING (school_id = public.get_current_user_school_id());

CREATE POLICY "Admins can manage courses" 
  ON public.courses 
  FOR ALL
  USING (
    public.get_current_user_role() = 'admin' 
    AND school_id = public.get_current_user_school_id()
  );

CREATE POLICY "Users can view students in their school" 
  ON public.students 
  FOR SELECT 
  USING (school_id = public.get_current_user_school_id());

CREATE POLICY "Admins can manage students" 
  ON public.students 
  FOR ALL
  USING (
    public.get_current_user_role() = 'admin' 
    AND school_id = public.get_current_user_school_id()
  );
