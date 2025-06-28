
-- Create a function to get the actual password hash for a specific user
CREATE OR REPLACE FUNCTION public.get_user_password_hash(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  password_hash text,
  email text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.password_hash,
    u.email,
    u.first_name,
    u.last_name
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.role = 'student'
    AND u.password_hash IS NOT NULL
    AND u.password_hash != '';
END;
$$;
