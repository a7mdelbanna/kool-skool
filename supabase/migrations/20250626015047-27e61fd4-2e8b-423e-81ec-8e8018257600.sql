
-- Fix the ambiguous column reference in add_student_subscription function
CREATE OR REPLACE FUNCTION public.add_student_subscription(
  p_student_id UUID,
  p_session_count INTEGER,
  p_duration_months INTEGER,
  p_start_date DATE,
  p_schedule JSONB,
  p_price_mode TEXT,
  p_price_per_session DECIMAL(10,2),
  p_fixed_price DECIMAL(10,2),
  p_total_price DECIMAL(10,2),
  p_currency TEXT,
  p_notes TEXT,
  p_status TEXT,
  p_current_user_id UUID,
  p_current_school_id UUID
)
RETURNS TABLE(
  id UUID,
  student_id UUID,
  session_count INTEGER,
  duration_months INTEGER,
  start_date DATE,
  schedule JSONB,
  price_mode TEXT,
  price_per_session DECIMAL(10,2),
  fixed_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  currency TEXT,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  student_record public.students;
  new_subscription_id UUID;
BEGIN
  -- Get current user info
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RAISE EXCEPTION 'User school mismatch';
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Only admins and teachers can add subscriptions';
  END IF;
  
  -- Verify student belongs to the same school
  SELECT * INTO student_record FROM public.students WHERE students.id = p_student_id;
  
  IF student_record.id IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RAISE EXCEPTION 'Student does not belong to your school';
  END IF;
  
  -- Insert the subscription
  INSERT INTO public.subscriptions (
    student_id,
    session_count,
    duration_months,
    start_date,
    schedule,
    price_mode,
    price_per_session,
    fixed_price,
    total_price,
    currency,
    notes,
    status
  ) VALUES (
    p_student_id,
    p_session_count,
    p_duration_months,
    p_start_date,
    p_schedule,
    p_price_mode,
    p_price_per_session,
    p_fixed_price,
    p_total_price,
    COALESCE(p_currency, 'USD'),
    p_notes,
    COALESCE(p_status, 'active')
  ) RETURNING subscriptions.id INTO new_subscription_id;
  
  -- Return the created subscription
  RETURN QUERY
  SELECT 
    sub.id,
    sub.student_id,
    sub.session_count,
    sub.duration_months,
    sub.start_date,
    sub.schedule,
    sub.price_mode,
    sub.price_per_session,
    sub.fixed_price,
    sub.total_price,
    sub.currency,
    sub.notes,
    sub.status,
    sub.created_at
  FROM public.subscriptions sub
  WHERE sub.id = new_subscription_id;
END;
$function$;
