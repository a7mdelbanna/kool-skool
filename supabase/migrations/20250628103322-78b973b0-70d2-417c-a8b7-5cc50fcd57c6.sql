
-- Create a function to get user passwords for school students
CREATE OR REPLACE FUNCTION public.get_students_password_info(p_school_id uuid)
RETURNS TABLE(
  user_id uuid,
  has_password boolean,
  password_length integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    (u.password_hash IS NOT NULL AND u.password_hash != '') as has_password,
    CASE 
      WHEN u.password_hash IS NOT NULL THEN length(u.password_hash)
      ELSE 0
    END as password_length
  FROM public.users u
  JOIN public.students s ON u.id = s.user_id
  WHERE s.school_id = p_school_id
    AND u.role = 'student';
END;
$$;

-- Also ensure the hash_password function exists (in case it's missing)
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple hash for demo - in production use proper bcrypt
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$;

-- Create a function to verify password updates
CREATE OR REPLACE FUNCTION public.verify_password_update(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  has_password boolean,
  password_hash_length integer,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    (u.password_hash IS NOT NULL AND u.password_hash != '') as has_password,
    CASE 
      WHEN u.password_hash IS NOT NULL THEN length(u.password_hash)
      ELSE 0
    END as password_hash_length,
    u.updated_at as last_updated
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;
