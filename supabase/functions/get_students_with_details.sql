
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
  lesson_type TEXT,
  teacher_first_name TEXT,
  teacher_last_name TEXT,
  teacher_email TEXT,
  payment_status TEXT,
  lessons_count INTEGER,
  next_session_date TIMESTAMP WITH TIME ZONE,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  next_payment_amount NUMERIC,
  subscription_progress TEXT
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
    c.lesson_type,
    t.first_name as teacher_first_name,
    t.last_name as teacher_last_name,
    t.email as teacher_email,
    -- Calculate payment status based on total payments vs total subscription costs
    CASE 
      WHEN COALESCE(payments.total_paid, 0) >= COALESCE(subscriptions.total_cost, 0) AND COALESCE(subscriptions.total_cost, 0) > 0 THEN 'paid'
      WHEN COALESCE(payments.total_paid, 0) > 0 AND COALESCE(subscriptions.total_cost, 0) > 0 THEN 'pending'
      WHEN COALESCE(subscriptions.total_cost, 0) > 0 THEN 'pending'
      ELSE 'pending'
    END as payment_status,
    -- Count total lessons/sessions for this student (cast to integer to match return type)
    COALESCE(sessions.total_sessions, 0)::integer as lessons_count,
    -- Get the next scheduled session date
    sessions.next_session_date,
    -- Return stored next payment date and amount
    s.next_payment_date,
    s.next_payment_amount,
    -- Show subscription progress (completed/total for active subscription)
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
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN courses c ON s.course_id = c.id
  LEFT JOIN users t ON s.teacher_id = t.id
  -- Calculate total payments for each student
  LEFT JOIN (
    SELECT 
      sp.student_id,
      SUM(sp.amount) as total_paid
    FROM public.student_payments sp
    WHERE sp.status = 'completed'
    GROUP BY sp.student_id
  ) payments ON s.id = payments.student_id
  -- Calculate total subscription costs and get active subscription info
  LEFT JOIN (
    SELECT 
      sub.student_id,
      SUM(sub.total_price) as total_cost,
      MAX(sub.sessions_completed) as sessions_completed,
      MAX(sub.session_count) as total_sessions
    FROM public.subscriptions sub
    WHERE sub.status = 'active'
    GROUP BY sub.student_id
  ) subscriptions ON s.id = subscriptions.student_id
  -- Calculate sessions count and next session
  LEFT JOIN (
    SELECT 
      ls.student_id,
      COUNT(*)::integer as total_sessions,
      MIN(CASE WHEN ls.status = 'scheduled' AND ls.scheduled_date > NOW() THEN ls.scheduled_date END) as next_session_date
    FROM public.lesson_sessions ls
    GROUP BY ls.student_id
  ) sessions ON s.id = sessions.student_id
  WHERE s.school_id = p_school_id
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
