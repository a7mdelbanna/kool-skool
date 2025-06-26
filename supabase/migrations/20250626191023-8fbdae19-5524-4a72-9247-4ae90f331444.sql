
-- Drop the existing function and create the correct one with matching signature
DROP FUNCTION IF EXISTS public.create_student_with_profile(text, text, text, text, uuid, uuid, text, text, text, text, jsonb);

-- Create the function with the correct signature that matches the client call
CREATE OR REPLACE FUNCTION public.create_student_with_profile(
  student_email text,
  student_password text,
  student_first_name text,
  student_last_name text,
  teacher_id uuid,
  course_id uuid,
  age_group text,
  level text,
  phone text DEFAULT NULL,
  date_of_birth text DEFAULT NULL,
  telegram text DEFAULT NULL,
  whatsapp text DEFAULT NULL,
  instagram text DEFAULT NULL,
  viber text DEFAULT NULL,
  facebook text DEFAULT NULL,
  skype text DEFAULT NULL,
  zoom text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_record public.users;
  student_user_id UUID;
  student_id UUID;
  hashed_password TEXT;
  birth_date DATE;
BEGIN
  -- Get current user info with explicit auth check
  SELECT * INTO current_user_record FROM public.users WHERE id = auth.uid();
  
  -- Debug logging
  RAISE NOTICE 'Current user ID: %', auth.uid();
  RAISE NOTICE 'Current user record: %', current_user_record;
  RAISE NOTICE 'Current user school_id: %', current_user_record.school_id;
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found or not authenticated'
    );
  END IF;
  
  IF current_user_record.school_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User does not have a school_id'
    );
  END IF;
  
  IF current_user_record.role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can create students'
    );
  END IF;
  
  -- Hash password
  hashed_password := public.hash_password(student_password);
  
  -- Convert date_of_birth string to DATE if provided
  IF date_of_birth IS NOT NULL AND date_of_birth != '' THEN
    BEGIN
      birth_date := date_of_birth::DATE;
    EXCEPTION
      WHEN OTHERS THEN
        birth_date := NULL;
    END;
  ELSE
    birth_date := NULL;
  END IF;
  
  -- Create user record for student with separate social media fields
  INSERT INTO public.users (
    email, 
    first_name, 
    last_name, 
    role, 
    school_id, 
    phone, 
    password_hash, 
    created_by,
    date_of_birth,
    telegram,
    whatsapp,
    instagram,
    viber,
    facebook,
    skype,
    zoom
  )
  VALUES (
    student_email, 
    student_first_name, 
    student_last_name, 
    'student', 
    current_user_record.school_id, 
    phone, 
    hashed_password, 
    auth.uid(),
    birth_date,
    telegram,
    whatsapp,
    instagram,
    viber,
    facebook,
    skype,
    zoom
  )
  RETURNING id INTO student_user_id;
  
  -- Create student record with explicit school_id
  INSERT INTO public.students (school_id, user_id, teacher_id, course_id, age_group, level, phone)
  VALUES (current_user_record.school_id, student_user_id, teacher_id, course_id, age_group, level, phone)
  RETURNING id INTO student_id;
  
  RETURN json_build_object(
    'success', true,
    'student_id', student_id,
    'user_id', student_user_id
  );
END;
$$;
