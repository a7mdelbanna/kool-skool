
-- Fix the add_student_subscription function to properly distribute sessions across multiple scheduled days
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
  session_cost NUMERIC;
  schedule_item JSONB;
  sorted_schedule JSONB[];
  base_date DATE;
  session_datetime TIMESTAMP WITH TIME ZONE;
  sessions_created INTEGER := 0;
  schedule_cycle_index INTEGER := 0;
  day_of_week INTEGER;
  target_day_of_week INTEGER;
  days_to_add INTEGER;
  session_time TEXT;
  current_session_date DATE;
BEGIN
  -- Get current user info and validate permissions
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
  
  -- Convert schedule JSONB to array and sort by day of week
  SELECT array_agg(value ORDER BY 
    CASE value ->> 'day'
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
      WHEN 'Sunday' THEN 7
    END
  ) INTO sorted_schedule
  FROM jsonb_array_elements(p_schedule);
  
  -- Start from the subscription start date
  base_date := p_start_date;
  
  -- Create sessions by cycling through the schedule
  WHILE sessions_created < p_session_count LOOP
    -- Get the current schedule item (cycle through the array)
    schedule_cycle_index := (sessions_created % array_length(sorted_schedule, 1)) + 1;
    schedule_item := sorted_schedule[schedule_cycle_index];
    session_time := schedule_item ->> 'time';
    
    -- Convert day name to day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    target_day_of_week := CASE schedule_item ->> 'day'
      WHEN 'Sunday' THEN 0
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
    END;
    
    -- Find the next occurrence of this day starting from base_date
    day_of_week := EXTRACT(DOW FROM base_date);
    
    -- Calculate days to add to get to target day
    IF target_day_of_week >= day_of_week THEN
      days_to_add := target_day_of_week - day_of_week;
    ELSE
      days_to_add := 7 - day_of_week + target_day_of_week;
    END IF;
    
    -- Calculate the session date
    current_session_date := base_date + days_to_add;
    
    -- Create session datetime
    session_datetime := current_session_date::DATE + session_time::TIME;
    
    -- Insert the session
    INSERT INTO public.lesson_sessions (
      subscription_id,
      student_id,
      scheduled_date,
      duration_minutes,
      status,
      payment_status,
      cost,
      notes,
      index_in_sub
    ) VALUES (
      new_subscription_id,
      p_student_id,
      session_datetime,
      60, -- Default 60 minutes
      'scheduled',
      'paid',
      session_cost,
      'Auto-generated session ' || (sessions_created + 1) || ' of ' || p_session_count,
      sessions_created + 1
    );
    
    sessions_created := sessions_created + 1;
    
    -- Move base_date forward by 1 day after creating each session
    -- This ensures we don't create overlapping sessions and maintain proper distribution
    base_date := current_session_date + 1;
    
    -- Safety check to prevent infinite loop
    IF base_date > p_start_date + INTERVAL '1 year' THEN
      RAISE EXCEPTION 'Unable to schedule sessions - check schedule configuration';
    END IF;
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
