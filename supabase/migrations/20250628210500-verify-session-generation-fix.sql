
-- Verify that the generate_lesson_sessions_v2 function exists and works properly
-- This migration will ensure the session generation works correctly for renewed subscriptions

-- First, let's make sure the generate_lesson_sessions_v2 function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'generate_lesson_sessions_v2' 
    AND pronargs = 1
  ) THEN
    RAISE EXCEPTION 'generate_lesson_sessions_v2 function not found - this is required for session generation';
  END IF;
END $$;

-- Test that the updated renew_subscription function includes session generation
-- by checking the function definition
DO $$
DECLARE
  func_body TEXT;
BEGIN
  SELECT prosrc INTO func_body
  FROM pg_proc 
  WHERE proname = 'renew_subscription' 
  AND pronargs = 4;
  
  IF func_body IS NULL THEN
    RAISE EXCEPTION 'renew_subscription function not found';
  END IF;
  
  IF func_body NOT LIKE '%generate_lesson_sessions_v2%' THEN
    RAISE EXCEPTION 'renew_subscription function does not include session generation call';
  END IF;
  
  RAISE NOTICE 'renew_subscription function correctly includes session generation';
END $$;

-- Add a helper function to debug session generation issues
CREATE OR REPLACE FUNCTION public.debug_subscription_sessions(p_subscription_id uuid)
RETURNS TABLE(
  subscription_found boolean,
  session_count integer,
  generated_sessions integer,
  schedule_valid boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  sub_record public.subscriptions;
  sessions_count integer;
  schedule_check boolean := false;
BEGIN
  -- Check if subscription exists
  SELECT * INTO sub_record FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF sub_record.id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, false, 'Subscription not found';
    RETURN;
  END IF;
  
  -- Count existing sessions
  SELECT COUNT(*) INTO sessions_count FROM public.lesson_sessions WHERE subscription_id = p_subscription_id;
  
  -- Check if schedule is valid JSON
  BEGIN
    schedule_check := (sub_record.schedule IS NOT NULL AND jsonb_array_length(sub_record.schedule) > 0);
  EXCEPTION WHEN OTHERS THEN
    schedule_check := false;
  END;
  
  RETURN QUERY SELECT 
    true,
    sub_record.session_count,
    sessions_count,
    schedule_check,
    CASE 
      WHEN sessions_count = 0 AND sub_record.session_count > 0 THEN 'No sessions generated for subscription'
      WHEN sessions_count != sub_record.session_count THEN 'Session count mismatch'
      ELSE 'OK'
    END;
END;
$function$;

-- Add logging to the generate_lesson_sessions_v2 function to help debug issues
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
  RAISE NOTICE 'Starting session generation for subscription: %', p_subscription_id;
  
  -- Get subscription details
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;
  
  RAISE NOTICE 'Subscription found - sessions to create: %, schedule: %', v_subscription.session_count, v_subscription.schedule;
  
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
  
  RAISE NOTICE 'Sorted schedule array length: %', array_length(v_sorted_schedule, 1);
  
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
    
    RAISE NOTICE 'Creating session % of % on %', v_sessions_created + 1, v_subscription.session_count, v_session_datetime;
    
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
  
  RAISE NOTICE 'Successfully created % sessions for subscription %', v_sessions_created, p_subscription_id;
END;
$$;
