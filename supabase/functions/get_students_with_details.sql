
-- Function to retrieve students with joined user and course details
CREATE OR REPLACE FUNCTION public.get_students_with_details(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  user_id UUID,
  teacher_id UUID,
  course_id UUID,
  age_group TEXT,
  level TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  course_name TEXT,
  lesson_type TEXT
) AS $$
BEGIN
  -- Use a SECURITY DEFINER function to bypass RLS policies
  -- This allows retrieving data regardless of who calls the function
  RETURN QUERY
  SELECT 
    s.id,
    s.school_id,
    s.user_id,
    s.teacher_id,
    s.course_id,
    s.age_group,
    s.level,
    s.phone,
    s.created_at,
    u.first_name,
    u.last_name,
    u.email,
    c.name as course_name,
    c.lesson_type
  FROM students s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN courses c ON s.course_id = c.id
  WHERE s.school_id = p_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
