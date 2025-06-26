
-- Update the get_students_with_details function to include subscription progress calculation
CREATE OR REPLACE FUNCTION get_students_with_details(school_id_param UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  level TEXT,
  age_group TEXT,
  course_name TEXT,
  lesson_type TEXT,
  teacher_first_name TEXT,
  teacher_last_name TEXT,
  teacher_id UUID,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  next_payment_amount NUMERIC,
  subscription_progress TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    s.level,
    s.age_group,
    c.name as course_name,
    c.lesson_type,
    t.first_name as teacher_first_name,
    t.last_name as teacher_last_name,
    s.teacher_id,
    s.next_payment_date,
    s.next_payment_amount,
    COALESCE(
      (
        SELECT 
          CONCAT(
            COUNT(CASE WHEN ls.status = 'completed' AND ls.counts_toward_completion = true THEN 1 END)::TEXT,
            '/',
            COUNT(CASE WHEN ls.counts_toward_completion = true THEN 1 END)::TEXT
          )
        FROM lesson_sessions ls
        WHERE ls.student_id = s.id
        AND EXISTS (
          SELECT 1 FROM subscriptions sub 
          WHERE sub.student_id = s.id 
          AND sub.status = 'active'
          AND ls.subscription_id = sub.id
        )
      ),
      '0/0'
    ) as subscription_progress
  FROM students s
  JOIN users u ON s.user_id = u.id
  LEFT JOIN courses c ON s.course_id = c.id
  LEFT JOIN users t ON s.teacher_id = t.id
  WHERE s.school_id = school_id_param;
END;
$$;
