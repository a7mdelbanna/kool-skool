
-- Create a function to get the actual password for display purposes
CREATE OR REPLACE FUNCTION public.get_student_password(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  password_hash text,
  has_password boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.password_hash,
    (u.password_hash IS NOT NULL AND u.password_hash != '') as has_password
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.role = 'student';
END;
$$;
