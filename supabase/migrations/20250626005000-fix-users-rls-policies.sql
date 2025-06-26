
-- Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view team members in same school" ON public.users;
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;

-- Create security definer functions to avoid RLS recursion
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

-- Create new RLS policies using the security definer functions
CREATE POLICY "Users can view team members in same school" 
  ON public.users 
  FOR SELECT 
  USING (
    school_id = public.get_current_user_school_id()
    AND role != 'student'
  );

-- Create policy to allow users to view their own record
CREATE POLICY "Users can view their own record" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Create policy to allow admins to manage users in their school
CREATE POLICY "Admins can manage users in same school" 
  ON public.users 
  FOR ALL
  USING (
    public.get_current_user_role() = 'admin' 
    AND school_id = public.get_current_user_school_id()
  );
