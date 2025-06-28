
-- Add a new column to store plain-text passwords
ALTER TABLE public.users 
ADD COLUMN password_plain text;

-- Update the get_user_password_hash function to return the plain-text password instead
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
  -- Add logging for debugging
  RAISE NOTICE 'Getting plain-text password for user_id: %', p_user_id;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.password_plain as password_hash, -- Return plain-text password instead of hash
    u.email,
    u.first_name,
    u.last_name
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.role = 'student'
    AND u.password_plain IS NOT NULL
    AND u.password_plain != '';
    
  -- Log if no results found
  IF NOT FOUND THEN
    RAISE NOTICE 'No plain-text password found for user_id: %', p_user_id;
  END IF;
END;
$$;

-- Update the hash_password function to also store the plain-text password
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple hash for demo - in production, use proper bcrypt/scrypt
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Create a new function to update both hashed and plain-text passwords
CREATE OR REPLACE FUNCTION public.update_student_password(
  p_user_id uuid,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hashed_password text;
BEGIN
  -- Hash the password
  hashed_password := public.hash_password(p_password);
  
  -- Update both hashed and plain-text passwords
  UPDATE public.users
  SET 
    password_hash = hashed_password,
    password_plain = p_password,
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_student_password(uuid, text) TO authenticated;
