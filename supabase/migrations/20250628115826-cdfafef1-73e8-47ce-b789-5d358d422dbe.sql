
-- Disable RLS on tables that students need to access
-- Since we're using custom local auth instead of Supabase auth, auth.uid() will always be NULL
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;

-- Create a function to verify student login credentials
CREATE OR REPLACE FUNCTION public.verify_student_login(p_email text, p_password text)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  school_id uuid,
  student_id uuid,
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.users;
  student_record public.students;
  password_match boolean := false;
BEGIN
  -- Look for user with this email and student role
  SELECT * INTO user_record 
  FROM public.users 
  WHERE users.email = LOWER(TRIM(p_email)) 
    AND users.role = 'student';
  
  -- If no user found, return failure
  IF user_record.id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::uuid, NULL::uuid,
      false, 'No student account found with this email address';
    RETURN;
  END IF;
  
  -- Check password (try plain text first, then hash)
  IF user_record.password_plain IS NOT NULL AND user_record.password_plain != '' THEN
    password_match := (p_password = user_record.password_plain);
  ELSIF user_record.password_hash IS NOT NULL AND user_record.password_hash != '' THEN
    password_match := (p_password = user_record.password_hash);
  END IF;
  
  -- If password doesn't match, return failure
  IF NOT password_match THEN
    RETURN QUERY SELECT 
      user_record.id, user_record.first_name, user_record.last_name, 
      user_record.email, user_record.role, user_record.school_id, NULL::uuid,
      false, 'Invalid password';
    RETURN;
  END IF;
  
  -- Get student record
  SELECT * INTO student_record 
  FROM public.students 
  WHERE students.user_id = user_record.id;
  
  -- If no student record found, return failure
  IF student_record.id IS NULL THEN
    RETURN QUERY SELECT 
      user_record.id, user_record.first_name, user_record.last_name, 
      user_record.email, user_record.role, user_record.school_id, NULL::uuid,
      false, 'Student profile not found';
    RETURN;
  END IF;
  
  -- Success - return user and student data
  RETURN QUERY SELECT 
    user_record.id, user_record.first_name, user_record.last_name, 
    user_record.email, user_record.role, user_record.school_id, student_record.id,
    true, 'Login successful';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_student_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_student_login(text, text) TO anon;
