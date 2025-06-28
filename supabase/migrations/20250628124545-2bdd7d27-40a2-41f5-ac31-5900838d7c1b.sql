
-- Add super admin role to users table role constraint
-- First, let's see what roles are currently allowed
DO $$
DECLARE
    constraint_def text;
BEGIN
    -- Get the current constraint definition
    SELECT pg_get_constraintdef(oid) INTO constraint_def 
    FROM pg_constraint 
    WHERE conname LIKE '%role%' AND conrelid = 'public.users'::regclass;
    
    -- Drop the existing constraint if it exists
    IF constraint_def IS NOT NULL THEN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    END IF;
    
    -- Add the new constraint with superadmin role
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'teacher'::text, 'staff'::text, 'student'::text, 'superadmin'::text]));
END $$;

-- Create a function to verify super admin login
CREATE OR REPLACE FUNCTION public.verify_superadmin_login(p_email text, p_password text)
RETURNS TABLE(user_id uuid, first_name text, last_name text, email text, role text, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record public.users;
  password_match boolean := false;
BEGIN
  -- Look for user with this email and superadmin role
  SELECT * INTO user_record 
  FROM public.users 
  WHERE users.email = LOWER(TRIM(p_email)) 
    AND users.role = 'superadmin';
  
  -- If no user found, return failure
  IF user_record.id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text,
      false, 'No super admin account found with this email address';
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
      user_record.email, user_record.role,
      false, 'Invalid password';
    RETURN;
  END IF;
  
  -- Success - return user data
  RETURN QUERY SELECT 
    user_record.id, user_record.first_name, user_record.last_name, 
    user_record.email, user_record.role,
    true, 'Login successful';
END;
$function$;

-- Create function to get all licenses with school information
CREATE OR REPLACE FUNCTION public.get_all_licenses_with_schools()
RETURNS TABLE(
  license_id uuid, 
  license_key text, 
  expires_at timestamp with time zone, 
  duration_days integer, 
  is_active boolean, 
  license_created_at timestamp with time zone,
  school_id uuid,
  school_name text,
  school_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as license_id,
    l.license_key,
    l.expires_at,
    l.duration_days,
    l.is_active,
    l.created_at as license_created_at,
    s.id as school_id,
    s.name as school_name,
    s.created_at as school_created_at
  FROM public.licenses l
  LEFT JOIN public.schools s ON l.id = s.license_id
  ORDER BY l.created_at DESC;
END;
$function$;

-- Create function to create new license
CREATE OR REPLACE FUNCTION public.create_license(
  p_license_key text,
  p_duration_days integer,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_license_id uuid;
  calculated_expires_at timestamp with time zone;
BEGIN
  -- Check if license key already exists
  IF EXISTS (SELECT 1 FROM public.licenses WHERE license_key = p_license_key) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'License key already exists'
    );
  END IF;
  
  -- Calculate expiration date
  calculated_expires_at := NOW() + (p_duration_days || ' days')::interval;
  
  -- Insert new license
  INSERT INTO public.licenses (
    license_key,
    duration_days,
    expires_at,
    is_active
  ) VALUES (
    p_license_key,
    p_duration_days,
    calculated_expires_at,
    p_is_active
  ) RETURNING id INTO new_license_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'License created successfully',
    'license_id', new_license_id
  );
END;
$function$;

-- Create function to update license status
CREATE OR REPLACE FUNCTION public.update_license_status(
  p_license_id uuid,
  p_is_active boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update license status
  UPDATE public.licenses 
  SET is_active = p_is_active
  WHERE id = p_license_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'License not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'License status updated successfully'
  );
END;
$function$;
