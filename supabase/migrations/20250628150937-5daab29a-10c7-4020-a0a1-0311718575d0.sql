
-- Add cascade deletion for subscription-related data
-- First, let's create a function to safely delete a subscription with all related data
CREATE OR REPLACE FUNCTION public.delete_subscription_with_related_data(p_subscription_id uuid, p_current_user_id uuid, p_current_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  subscription_record public.subscriptions;
  student_record public.students;
  deleted_sessions_count INTEGER := 0;
  deleted_payments_count INTEGER := 0;
BEGIN
  -- Get current user info and validate permissions
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User school mismatch'
    );
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins and teachers can delete subscriptions'
    );
  END IF;
  
  -- Get the subscription record and verify it exists
  SELECT * INTO subscription_record FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Verify the student belongs to the same school
  SELECT * INTO student_record FROM public.students WHERE id = subscription_record.student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student not found'
    );
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription does not belong to your school'
    );
  END IF;
  
  -- Delete related lesson sessions first
  DELETE FROM public.lesson_sessions 
  WHERE subscription_id = p_subscription_id;
  
  GET DIAGNOSTICS deleted_sessions_count = ROW_COUNT;
  
  -- Delete related payments that reference this subscription (if any)
  -- Note: student_payments don't directly reference subscriptions, but transactions might
  DELETE FROM public.transactions 
  WHERE subscription_id = p_subscription_id;
  
  GET DIAGNOSTICS deleted_payments_count = ROW_COUNT;
  
  -- Finally, delete the subscription itself
  DELETE FROM public.subscriptions WHERE id = p_subscription_id;
  
  -- Verify deletion was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to delete subscription'
    );
  END IF;
  
  -- Recalculate next payment info for the student
  PERFORM public.calculate_next_payment_info(subscription_record.student_id);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription and all related data deleted successfully',
    'deleted_sessions', deleted_sessions_count,
    'deleted_transactions', deleted_payments_count
  );
END;
$function$;

-- Create function to update a subscription with all related data
CREATE OR REPLACE FUNCTION public.update_subscription_with_related_data(
  p_subscription_id uuid,
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
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  subscription_record public.subscriptions;
  student_record public.students;
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
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User school mismatch'
    );
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins and teachers can update subscriptions'
    );
  END IF;
  
  -- Get the subscription record and verify it exists
  SELECT * INTO subscription_record FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Verify the student belongs to the same school
  SELECT * INTO student_record FROM public.students WHERE id = subscription_record.student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student not found'
    );
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription does not belong to your school'
    );
  END IF;
  
  -- Update the subscription
  UPDATE public.subscriptions 
  SET 
    session_count = p_session_count,
    duration_months = p_duration_months,
    start_date = p_start_date,
    schedule = p_schedule,
    price_mode = p_price_mode,
    price_per_session = p_price_per_session,
    fixed_price = p_fixed_price,
    total_price = p_total_price,
    currency = COALESCE(p_currency, 'USD'),
    notes = p_notes,
    status = COALESCE(p_status, 'active'),
    updated_at = now()
  WHERE id = p_subscription_id;
  
  -- Delete existing sessions that haven't been completed
  DELETE FROM public.lesson_sessions 
  WHERE subscription_id = p_subscription_id 
    AND status NOT IN ('completed', 'cancelled');
  
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
  
  -- Create new sessions by cycling through the schedule
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
      p_subscription_id,
      subscription_record.student_id,
      session_datetime,
      60, -- Default 60 minutes
      'scheduled',
      'paid',
      session_cost,
      'Updated session ' || (sessions_created + 1) || ' of ' || p_session_count,
      sessions_created + 1
    );
    
    sessions_created := sessions_created + 1;
    
    -- Move base_date forward by 1 day after creating each session
    base_date := current_session_date + 1;
    
    -- Safety check to prevent infinite loop
    IF base_date > p_start_date + INTERVAL '1 year' THEN
      RAISE EXCEPTION 'Unable to schedule sessions - check schedule configuration';
    END IF;
  END LOOP;
  
  -- Recalculate subscription progress and dates
  PERFORM public.recalculate_subscription_progress(p_subscription_id);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription updated successfully',
    'sessions_created', sessions_created
  );
END;
$function$;
