
-- Update the add_student_subscription function to generate lesson sessions
CREATE OR REPLACE FUNCTION public.add_student_subscription(
  p_student_id uuid, 
  p_session_count integer, 
  p_duration_months integer, 
  p_start_date date, 
  p_schedule jsonb, 
  p_price_mode text, 
  p_price_per_session numeric, 
  p_fixed_price numeric, 
  p_total_price numeric, 
  p_currency text, 
  p_notes text, 
  p_status text, 
  p_current_user_id uuid, 
  p_current_school_id uuid
)
RETURNS TABLE(
  id uuid, 
  student_id uuid, 
  session_count integer, 
  duration_months integer, 
  start_date date, 
  schedule jsonb, 
  price_mode text, 
  price_per_session numeric, 
  fixed_price numeric, 
  total_price numeric, 
  currency text, 
  notes text, 
  status text, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  student_record public.students;
  new_subscription_id UUID;
  session_date DATE;
  session_time TEXT;
  session_cost NUMERIC;
  schedule_item JSONB;
  week_offset INTEGER;
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
  
  -- Calculate session cost
  IF p_price_mode = 'perSession' THEN
    session_cost := COALESCE(p_price_per_session, 0);
  ELSE
    session_cost := COALESCE(p_total_price / p_session_count, 0);
  END IF;
  
  -- Generate lesson sessions based on schedule
  FOR schedule_item IN SELECT jsonb_array_elements(p_schedule)
  LOOP
    session_time := schedule_item ->> 'time';
    
    -- Generate sessions for each week over the duration
    FOR week_offset IN 0..(p_duration_months * 4 - 1) -- Approximate weeks per month
    LOOP
      -- Calculate session date based on day of week and week offset
      session_date := p_start_date + (week_offset * 7);
      
      -- Adjust to correct day of week
      CASE schedule_item ->> 'day'
        WHEN 'Monday' THEN session_date := session_date + (1 - EXTRACT(DOW FROM session_date))::INTEGER;
        WHEN 'Tuesday' THEN session_date := session_date + (2 - EXTRACT(DOW FROM session_date))::INTEGER;
        WHEN 'Wednesday' THEN session_date := session_date + (3 - EXTRACT(DOW FROM session_date))::INTEGER;
        WHEN 'Thursday' THEN session_date := session_date + (4 - EXTRACT(DOW FROM session_date))::INTEGER;
        WHEN 'Friday' THEN session_date := session_date + (5 - EXTRACT(DOW FROM session_date))::INTEGER;
        WHEN 'Saturday' THEN session_date := session_date + (6 - EXTRACT(DOW FROM session_date))::INTEGER;
        WHEN 'Sunday' THEN session_date := session_date + (7 - EXTRACT(DOW FROM session_date))::INTEGER;
      END CASE;
      
      -- Only create sessions if we haven't exceeded the session count
      IF (SELECT COUNT(*) FROM public.lesson_sessions WHERE subscription_id = new_subscription_id) < p_session_count THEN
        INSERT INTO public.lesson_sessions (
          subscription_id,
          student_id,
          scheduled_date,
          duration_minutes,
          status,
          payment_status,
          cost,
          notes
        ) VALUES (
          new_subscription_id,
          p_student_id,
          (session_date::TEXT || ' ' || session_time || ':00')::TIMESTAMP WITH TIME ZONE,
          60, -- Default 60 minutes
          'scheduled',
          'paid',
          session_cost,
          'Auto-generated from subscription'
        );
      END IF;
    END LOOP;
  END LOOP;
  
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
