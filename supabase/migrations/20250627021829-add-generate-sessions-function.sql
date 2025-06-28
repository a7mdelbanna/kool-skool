
-- Create the generate_lesson_sessions_v2 function that's referenced in renew_subscription
CREATE OR REPLACE FUNCTION generate_lesson_sessions_v2(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription RECORD;
  v_schedule_item JSONB;
  v_sorted_schedule JSONB[];
  v_base_date DATE;
  v_session_datetime TIMESTAMP WITH TIME ZONE;
  v_sessions_created INTEGER := 0;
  v_schedule_cycle_index INTEGER := 0;
  v_day_of_week INTEGER;
  v_target_day_of_week INTEGER;
  v_days_to_add INTEGER;
  v_session_time TEXT;
  v_current_session_date DATE;
  v_session_cost NUMERIC;
BEGIN
  -- Get subscription details
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;
  
  -- Calculate session cost
  IF v_subscription.price_mode = 'perSession' THEN
    v_session_cost := COALESCE(v_subscription.price_per_session, 0);
  ELSE
    v_session_cost := COALESCE(v_subscription.total_price / v_subscription.session_count, 0);
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
  ) INTO v_sorted_schedule
  FROM jsonb_array_elements(v_subscription.schedule);
  
  -- Start from the subscription start date
  v_base_date := v_subscription.start_date;
  
  -- Create sessions by cycling through the schedule
  WHILE v_sessions_created < v_subscription.session_count LOOP
    -- Get the current schedule item (cycle through the array)
    v_schedule_cycle_index := (v_sessions_created % array_length(v_sorted_schedule, 1)) + 1;
    v_schedule_item := v_sorted_schedule[v_schedule_cycle_index];
    v_session_time := v_schedule_item ->> 'time';
    
    -- Convert day name to day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    v_target_day_of_week := CASE v_schedule_item ->> 'day'
      WHEN 'Sunday' THEN 0
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
    END;
    
    -- Find the next occurrence of this day starting from v_base_date
    v_day_of_week := EXTRACT(DOW FROM v_base_date);
    
    -- Calculate days to add to get to target day
    IF v_target_day_of_week >= v_day_of_week THEN
      v_days_to_add := v_target_day_of_week - v_day_of_week;
    ELSE
      v_days_to_add := 7 - v_day_of_week + v_target_day_of_week;
    END IF;
    
    -- Calculate the session date
    v_current_session_date := v_base_date + v_days_to_add;
    
    -- Create session datetime
    v_session_datetime := v_current_session_date::DATE + v_session_time::TIME;
    
    -- Insert the session
    INSERT INTO lesson_sessions (
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
      v_subscription.student_id,
      v_session_datetime,
      60, -- Default 60 minutes
      'scheduled',
      'paid',
      v_session_cost,
      'Auto-generated session ' || (v_sessions_created + 1) || ' of ' || v_subscription.session_count,
      v_sessions_created + 1
    );
    
    v_sessions_created := v_sessions_created + 1;
    
    -- Move base_date forward by 1 day after creating each session
    -- This ensures we don't create overlapping sessions and maintain proper distribution
    v_base_date := v_current_session_date + 1;
    
    -- Safety check to prevent infinite loop
    IF v_base_date > v_subscription.start_date + INTERVAL '1 year' THEN
      RAISE EXCEPTION 'Unable to schedule sessions - check schedule configuration';
    END IF;
  END LOOP;
END;
$$;
