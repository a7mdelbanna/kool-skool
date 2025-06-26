
-- Fix the ambiguous column reference in add_student_subscription function
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
  schedule_item JSONB;
  session_time TEXT;
  session_cost NUMERIC;
  target_weekday INTEGER;
  start_weekday INTEGER;
  days_diff INTEGER;
  first_session_date DATE;
  session_datetime TIMESTAMP WITH TIME ZONE;
  i INTEGER;
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
  
  -- Process each schedule item (day/time combination)
  FOR schedule_item IN SELECT jsonb_array_elements(p_schedule)
  LOOP
    session_time := schedule_item ->> 'time';
    
    -- Convert day name to weekday number (0=Monday, 1=Tuesday, ..., 6=Sunday)
    -- This matches the pseudo-code where 0=Monday, 6=Sunday
    CASE schedule_item ->> 'day'
      WHEN 'Monday' THEN target_weekday := 0;
      WHEN 'Tuesday' THEN target_weekday := 1;
      WHEN 'Wednesday' THEN target_weekday := 2;
      WHEN 'Thursday' THEN target_weekday := 3;
      WHEN 'Friday' THEN target_weekday := 4;
      WHEN 'Saturday' THEN target_weekday := 5;
      WHEN 'Sunday' THEN target_weekday := 6;
    END CASE;
    
    -- Get the weekday of the start date (0=Monday, 6=Sunday)
    -- PostgreSQL's EXTRACT(DOW) returns 0=Sunday, 6=Saturday, so we need to convert
    start_weekday := (EXTRACT(DOW FROM p_start_date) + 6) % 7;
    
    -- Calculate days difference to get to target weekday
    days_diff := (target_weekday - start_weekday + 7) % 7;
    
    -- If days_diff is 0, we're already on the target weekday
    -- According to the pseudo-code, we want the NEXT occurrence, so add 7 days
    IF days_diff = 0 THEN
      days_diff := 7;
    END IF;
    
    first_session_date := p_start_date + days_diff;
    
    -- Generate sessions for this weekday/time combination
    -- Note: This assumes one schedule item per subscription for now
    -- If multiple schedule items should create separate sessions, adjust accordingly
    FOR i IN 0..(p_session_count - 1)
    LOOP
      -- Calculate session datetime for this iteration
      session_datetime := (first_session_date + (i * 7))::DATE + session_time::TIME;
      
      -- Create the session with deduplication check
      -- Check if session already exists for this subscription and index
      IF NOT EXISTS (
        SELECT 1 FROM public.lesson_sessions 
        WHERE subscription_id = new_subscription_id 
        AND lesson_sessions.notes LIKE '%index:' || i || '%'
      ) THEN
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
          session_datetime,
          60, -- Default 60 minutes, could be made configurable
          'scheduled',
          'paid',
          session_cost,
          'Auto-generated from subscription (index:' || i || ')'
        );
      END IF;
    END LOOP;
    
    -- Exit after processing the first schedule item to avoid duplicates
    -- If you want to support multiple schedule items creating separate sessions,
    -- remove this EXIT and adjust the session count logic
    EXIT;
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
