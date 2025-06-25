
-- Fix the ambiguous column reference in verify_license_and_create_school function
CREATE OR REPLACE FUNCTION public.verify_license_and_create_school(
  license_key TEXT,
  school_name TEXT,
  admin_first_name TEXT,
  admin_last_name TEXT,
  admin_email TEXT,
  admin_password TEXT
)
RETURNS JSON AS $$
DECLARE
  license_record public.licenses;
  school_id UUID;
  user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Check if license exists and is valid
  SELECT * INTO license_record FROM public.licenses 
  WHERE public.licenses.license_key = verify_license_and_create_school.license_key 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  IF license_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired license key'
    );
  END IF;
  
  -- Create school
  INSERT INTO public.schools (name, license_id)
  VALUES (school_name, license_record.id)
  RETURNING id INTO school_id;
  
  -- Hash password
  hashed_password := public.hash_password(admin_password);
  
  -- Create admin user
  INSERT INTO public.users (email, first_name, last_name, role, school_id, password_hash)
  VALUES (admin_email, admin_first_name, admin_last_name, 'admin', school_id, hashed_password)
  RETURNING id INTO user_id;
  
  RETURN json_build_object(
    'success', true,
    'school_id', school_id,
    'user_id', user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
