
-- Function to retrieve students with joined user and course details
CREATE OR REPLACE FUNCTION public.get_students_with_details(p_school_id UUID)
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', s.id,
    'school_id', s.school_id,
    'user_id', s.user_id,
    'teacher_id', s.teacher_id,
    'course_id', s.course_id,
    'age_group', s.age_group,
    'level', s.level,
    'phone', s.phone,
    'created_at', s.created_at,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'email', u.email,
    'course_name', c.name,
    'lesson_type', c.lesson_type
  )
  FROM students s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN courses c ON s.course_id = c.id
  WHERE s.school_id = p_school_id;
END;
$$ LANGUAGE plpgsql;
