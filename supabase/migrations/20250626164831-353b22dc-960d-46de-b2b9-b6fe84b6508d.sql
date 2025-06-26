
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_students_with_details(uuid);

-- Recreate the function with the new payment_status column
CREATE OR REPLACE FUNCTION public.get_students_with_details(p_school_id uuid)
RETURNS TABLE(
  id uuid, 
  school_id uuid, 
  user_id uuid, 
  teacher_id uuid, 
  course_id uuid, 
  age_group text, 
  level text, 
  phone text, 
  created_at timestamp with time zone, 
  first_name text, 
  last_name text, 
  email text, 
  course_name text, 
  lesson_type text, 
  teacher_first_name text, 
  teacher_last_name text, 
  teacher_email text,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
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
    END as payment_status
  FROM public.students s
  LEFT JOIN public.users u ON s.user_id = u.id
  LEFT JOIN public.courses c ON s.course_id = c.id
  LEFT JOIN public.users t ON s.teacher_id = t.id
  -- Calculate total payments for each student
  LEFT JOIN (
    SELECT 
      sp.student_id,
      SUM(sp.amount) as total_paid
    FROM public.student_payments sp
    WHERE sp.status = 'completed'
    GROUP BY sp.student_id
  ) payments ON s.id = payments.student_id
  -- Calculate total subscription costs for each student
  LEFT JOIN (
    SELECT 
      sub.student_id,
      SUM(sub.total_price) as total_cost
    FROM public.subscriptions sub
    WHERE sub.status = 'active'
    GROUP BY sub.student_id
  ) subscriptions ON s.id = subscriptions.student_id
  WHERE s.school_id = p_school_id
  ORDER BY s.created_at DESC;
END;
$function$
