
-- Update the create_student function to work with local auth and accept current_user_id
CREATE OR REPLACE FUNCTION public.create_student(
  student_email text, 
  student_password text, 
  student_first_name text, 
  student_last_name text, 
  teacher_id uuid, 
  course_id uuid, 
  age_group text, 
  level text, 
  phone text DEFAULT NULL::text,
  current_user_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  student_user_id UUID;
  student_id UUID;
  hashed_password TEXT;
BEGIN
  -- Get current user info using the passed user ID
  SELECT * INTO current_user_record FROM public.users WHERE id = current_user_id;
  
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
  
  -- Create user record for student (without social media fields)
  INSERT INTO public.users (
    email, 
    first_name, 
    last_name, 
    role, 
    school_id, 
    phone, 
    password_hash, 
    created_by
  )
  VALUES (
    student_email, 
    student_first_name, 
    student_last_name, 
    'student', 
    current_user_record.school_id, 
    phone, 
    hashed_password, 
    current_user_id
  )
  RETURNING id INTO student_user_id;
  
  -- Create student record with explicit school_id
  INSERT INTO public.students (
    school_id, 
    user_id, 
    teacher_id, 
    course_id, 
    age_group, 
    level, 
    phone
  )
  VALUES (
    current_user_record.school_id, 
    student_user_id, 
    teacher_id, 
    course_id, 
    age_group, 
    level, 
    phone
  )
  RETURNING id INTO student_id;
  
  RETURN json_build_object(
    'success', true,
    'student_id', student_id,
    'user_id', student_user_id
  );
END;
$function$;
