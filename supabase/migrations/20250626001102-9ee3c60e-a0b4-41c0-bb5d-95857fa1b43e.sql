
-- Enable RLS on courses table
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view courses from their school
CREATE POLICY "Users can view courses from their school" 
  ON public.courses 
  FOR SELECT 
  USING (school_id = public.get_current_user_school_id());

-- Create policy to allow admins to insert courses for their school
CREATE POLICY "Admins can create courses for their school" 
  ON public.courses 
  FOR INSERT 
  WITH CHECK (
    school_id = public.get_current_user_school_id() 
    AND public.get_current_user_role() = 'admin'
  );

-- Create policy to allow admins to update courses from their school
CREATE POLICY "Admins can update courses from their school" 
  ON public.courses 
  FOR UPDATE 
  USING (
    school_id = public.get_current_user_school_id() 
    AND public.get_current_user_role() = 'admin'
  );

-- Create policy to allow admins to delete courses from their school
CREATE POLICY "Admins can delete courses from their school" 
  ON public.courses 
  FOR DELETE 
  USING (
    school_id = public.get_current_user_school_id() 
    AND public.get_current_user_role() = 'admin'
  );
