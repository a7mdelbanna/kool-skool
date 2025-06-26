
-- Create RPC function to get lesson sessions for a student (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_lesson_sessions(p_student_id uuid)
RETURNS TABLE(
  id uuid,
  subscription_id uuid,
  student_id uuid,
  scheduled_date timestamp with time zone,
  duration_minutes integer,
  status text,
  payment_status text,
  cost numeric,
  notes text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.subscription_id,
    ls.student_id,
    ls.scheduled_date,
    ls.duration_minutes,
    ls.status,
    ls.payment_status,
    ls.cost,
    ls.notes,
    ls.created_at
  FROM public.lesson_sessions ls
  WHERE ls.student_id = p_student_id
  ORDER BY ls.scheduled_date ASC;
END;
$$;
