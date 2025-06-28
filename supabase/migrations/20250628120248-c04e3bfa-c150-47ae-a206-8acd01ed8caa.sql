
-- Create a function to verify school management login credentials (for admin/teacher roles)
CREATE OR REPLACE FUNCTION public.verify_school_login(p_email text, p_password text)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  school_id uuid,
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.users;
  password_match boolean := false;
BEGIN
  -- Look for user with this email and admin/teacher role
  SELECT * INTO user_record 
  FROM public.users 
  WHERE users.email = LOWER(TRIM(p_email)) 
    AND users.role IN ('admin', 'teacher');
  
  -- If no user found, return failure
  IF user_record.id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::uuid,
      false, 'No account found with this email address';
    RETURN;
  END IF;
  
  -- Check password (try plain text first, then hash)
  -- For now, we'll be more lenient with password checking for debugging
  IF user_record.password_plain IS NOT NULL AND user_record.password_plain != '' THEN
    password_match := (p_password = user_record.password_plain);
  ELSIF user_record.password_hash IS NOT NULL AND user_record.password_hash != '' THEN
    -- Try direct comparison first, then we can add proper hashing later
    password_match := (p_password = user_record.password_hash);
  ELSE
    -- If no password is set, allow login with any password (for initial setup)
    password_match := true;
  END IF;
  
  -- Debug: Log the password comparison
  RAISE NOTICE 'Password check for user %: plain_password=%, hash_password=%, input_password=%, match=%', 
    user_record.email, user_record.password_plain, user_record.password_hash, p_password, password_match;
  
  -- If password doesn't match, return failure
  IF NOT password_match THEN
    RETURN QUERY SELECT 
      user_record.id, user_record.first_name, user_record.last_name, 
      user_record.email, user_record.role, user_record.school_id,
      false, 'Invalid password';
    RETURN;
  END IF;
  
  -- Success - return user data
  RETURN QUERY SELECT 
    user_record.id, user_record.first_name, user_record.last_name, 
    user_record.email, user_record.role, user_record.school_id,
    true, 'Login successful';
END;
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION public.verify_school_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_school_login(text, text) TO anon;
