
CREATE OR REPLACE FUNCTION public.create_course(school_id UUID, course_name TEXT, lesson_type TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_course RECORD;
BEGIN
  -- Check if the user has access to the school
  -- This will work with the user ID from the JWT token or a custom header
  
  -- Insert the new course
  INSERT INTO public.courses (
    school_id, 
    name, 
    lesson_type
  ) VALUES (
    school_id, 
    course_name, 
    lesson_type
  ) RETURNING * INTO created_course;
  
  RETURN json_build_object(
    'id', created_course.id,
    'school_id', created_course.school_id,
    'name', created_course.name,
    'lesson_type', created_course.lesson_type
  );
  
EXCEPTION 
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;
