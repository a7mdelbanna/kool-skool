
-- Comprehensive fix for session generation in renewed subscriptions
-- This migration ensures that sessions are properly generated when subscriptions are renewed

-- First, let's create an improved version of the generate_lesson_sessions_v2 function
-- with better error handling and logging
CREATE OR REPLACE FUNCTION generate_lesson_sessions_v2(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_error_msg TEXT;
BEGIN
  -- Add comprehensive logging
  RAISE NOTICE 'Starting session generation for subscription: %', p_subscription_id;
  
  -- Validate input
  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Subscription ID cannot be NULL';
  END IF;
  
  -- Get subscription details with better error handling
  BEGIN
    SELECT * INTO STRICT v_subscription
    FROM subscriptions
    WHERE id = p_subscription_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Multiple subscriptions found for ID: %', p_subscription_id;
  END;
  
  RAISE NOTICE 'Subscription found - Student: %, Sessions to create: %, Schedule: %', 
    v_subscription.student_id, v_subscription.session_count, v_subscription.schedule;
  
  -- Validate subscription data
  IF v_subscription.session_count <= 0 THEN
    RAISE EXCEPTION 'Invalid session count: %', v_subscription.session_count;
  END IF;
  
  IF v_subscription.schedule IS NULL OR jsonb_array_length(v_subscription.schedule) = 0 THEN
    RAISE EXCEPTION 'Invalid or empty schedule for subscription: %', p_subscription_id;
  END IF;
  
  -- Calculate session cost
  IF v_subscription.price_mode = 'perSession' THEN
    v_session_cost := COALESCE(v_subscription.price_per_session, 0);
  ELSE
    v_session_cost := COALESCE(v_subscription.total_price / v_subscription.session_count, 0);
  END IF;
  
  RAISE NOTICE 'Calculated session cost: %', v_session_cost;
  
  -- Convert schedule JSONB to array and sort by day of week
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      RAISE EXCEPTION 'Error processing schedule: %', v_error_msg;
  END;
  
  IF v_sorted_schedule IS NULL OR array_length(v_sorted_schedule, 1) = 0 THEN
    RAISE EXCEPTION 'Failed to process schedule for subscription: %', p_subscription_id;
  END IF;
  
  RAISE NOTICE 'Sorted schedule array length: %', array_length(v_sorted_schedule, 1);
  
  -- Start from the subscription start date
  v_base_date := v_subscription.start_date;
  RAISE NOTICE 'Starting from base date: %', v_base_date;
  
  -- Create sessions by cycling through the schedule
  WHILE v_sessions_created < v_subscription.session_count LOOP
    BEGIN
      -- Get the current schedule item (cycle through the array)
      v_schedule_cycle_index := (v_sessions_created % array_length(v_sorted_schedule, 1)) + 1;
      v_schedule_item := v_sorted_schedule[v_schedule_cycle_index];
      v_session_time := v_schedule_item ->> 'time';
      
      IF v_session_time IS NULL OR v_session_time = '' THEN
        RAISE EXCEPTION 'Invalid session time in schedule item: %', v_schedule_item;
      END IF;
      
      -- Convert day name to day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
      v_target_day_of_week := CASE v_schedule_item ->> 'day'
        WHEN 'Sunday' THEN 0
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        ELSE NULL
      END;
      
      IF v_target_day_of_week IS NULL THEN
        RAISE EXCEPTION 'Invalid day in schedule item: %', v_schedule_item;
      END IF;
      
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
      
      RAISE NOTICE 'Creating session % of % on % (cycle index: %, schedule item: %)', 
        v_sessions_created + 1, v_subscription.session_count, v_session_datetime, 
        v_schedule_cycle_index, v_schedule_item;
      
      -- Insert the session with error handling
      BEGIN
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
        
        RAISE NOTICE 'Successfully inserted session % for subscription %', v_sessions_created + 1, p_subscription_id;
        
      EXCEPTION
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
          RAISE EXCEPTION 'Error inserting session %: %', v_sessions_created + 1, v_error_msg;
      END;
      
      v_sessions_created := v_sessions_created + 1;
      
      -- Move base_date forward by 1 day after creating each session
      -- This ensures we don't create overlapping sessions and maintain proper distribution
      v_base_date := v_current_session_date + 1;
      
      -- Safety check to prevent infinite loop
      IF v_base_date > v_subscription.start_date + INTERVAL '1 year' THEN
        RAISE EXCEPTION 'Unable to schedule sessions - check schedule configuration. Reached safety limit.';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RAISE EXCEPTION 'Error in session creation loop at session %: %', v_sessions_created + 1, v_error_msg;
    END;
  END LOOP;
  
  RAISE NOTICE 'Successfully created % sessions for subscription %', v_sessions_created, p_subscription_id;
  
  -- Verify that sessions were actually created
  DECLARE
    v_actual_session_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_actual_session_count
    FROM lesson_sessions
    WHERE subscription_id = p_subscription_id;
    
    RAISE NOTICE 'Verification: Found % sessions in database for subscription %', v_actual_session_count, p_subscription_id;
    
    IF v_actual_session_count != v_subscription.session_count THEN
      RAISE WARNING 'Session count mismatch: expected %, found %', v_subscription.session_count, v_actual_session_count;
    END IF;
  END;
  
END;
$$;

-- Now let's update the renew_subscription function to ensure it properly calls session generation
-- and handles any errors that might occur
CREATE OR REPLACE FUNCTION public.renew_subscription(
  p_subscription_id uuid,
  p_new_start_date date,
  p_current_user_id uuid,
  p_current_school_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  original_subscription public.subscriptions;
  student_record public.students;
  new_subscription_id UUID;
  new_end_date DATE;
  v_error_msg TEXT;
  v_session_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting subscription renewal process for subscription: %', p_subscription_id;
  
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
      'message', 'Only admins and teachers can renew subscriptions'
    );
  END IF;
  
  -- Get the original subscription
  SELECT * INTO original_subscription FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF original_subscription.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Original subscription not found'
    );
  END IF;
  
  RAISE NOTICE 'Original subscription found: % sessions, % months duration', 
    original_subscription.session_count, original_subscription.duration_months;
  
  -- Verify the student belongs to the same school
  SELECT * INTO student_record FROM public.students WHERE id = original_subscription.student_id;
  
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
  
  -- Calculate new end date
  new_end_date := p_new_start_date + INTERVAL '1 month' * original_subscription.duration_months;
  
  RAISE NOTICE 'Creating renewed subscription from % to %', p_new_start_date, new_end_date;
  
  -- Create the renewed subscription
  BEGIN
    INSERT INTO public.subscriptions (
      student_id,
      session_count,
      duration_months,
      start_date,
      end_date,
      schedule,
      price_mode,
      price_per_session,
      fixed_price,
      total_price,
      currency,
      notes,
      status
    ) VALUES (
      original_subscription.student_id,
      original_subscription.session_count,
      original_subscription.duration_months,
      p_new_start_date,
      new_end_date,
      original_subscription.schedule,
      original_subscription.price_mode,
      original_subscription.price_per_session,
      original_subscription.fixed_price,
      original_subscription.total_price,
      original_subscription.currency,
      COALESCE(original_subscription.notes, '') || ' (Renewed from subscription ' || p_subscription_id || ')',
      'active'
    ) RETURNING id INTO new_subscription_id;
    
    RAISE NOTICE 'New subscription created with ID: %', new_subscription_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      RAISE EXCEPTION 'Error creating renewed subscription: %', v_error_msg;
  END;
  
  -- Generate lesson sessions for the new subscription using the existing function
  BEGIN
    RAISE NOTICE 'Calling generate_lesson_sessions_v2 for subscription: %', new_subscription_id;
    
    PERFORM generate_lesson_sessions_v2(new_subscription_id);
    
    RAISE NOTICE 'Session generation completed for subscription: %', new_subscription_id;
    
    -- Verify sessions were created
    SELECT COUNT(*) INTO v_session_count
    FROM lesson_sessions
    WHERE subscription_id = new_subscription_id;
    
    RAISE NOTICE 'Verification: % sessions created for subscription %', v_session_count, new_subscription_id;
    
    IF v_session_count = 0 THEN
      RAISE WARNING 'No sessions were created for subscription %', new_subscription_id;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      RAISE EXCEPTION 'Error generating sessions for renewed subscription %: %', new_subscription_id, v_error_msg;
  END;
  
  -- Update original subscription notes to indicate it was renewed
  UPDATE public.subscriptions 
  SET notes = COALESCE(notes, '') || ' (Renewed as subscription ' || new_subscription_id || ')'
  WHERE id = p_subscription_id;
  
  -- Recalculate next payment info for the student
  BEGIN
    PERFORM public.calculate_next_payment_info(original_subscription.student_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Don't fail the renewal if payment info calculation fails
      RAISE WARNING 'Failed to recalculate payment info for student %', original_subscription.student_id;
  END;
  
  RAISE NOTICE 'Subscription renewal completed successfully. New subscription: %', new_subscription_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription renewed successfully with ' || v_session_count || ' sessions generated',
    'new_subscription_id', new_subscription_id,
    'sessions_created', v_session_count
  );
END;
$function$;

-- Add a helper function to manually trigger session generation for existing subscriptions without sessions
CREATE OR REPLACE FUNCTION public.regenerate_missing_sessions(p_subscription_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_existing_sessions_count INTEGER;
  v_subscription_record public.subscriptions;
  v_error_msg TEXT;
BEGIN
  -- Check if subscription exists
  SELECT * INTO v_subscription_record
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  IF v_subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Count existing sessions
  SELECT COUNT(*) INTO v_existing_sessions_count
  FROM lesson_sessions
  WHERE subscription_id = p_subscription_id;
  
  RAISE NOTICE 'Subscription % has % existing sessions, expected %', 
    p_subscription_id, v_existing_sessions_count, v_subscription_record.session_count;
  
  IF v_existing_sessions_count >= v_subscription_record.session_count THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription already has the expected number of sessions',
      'existing_sessions', v_existing_sessions_count,
      'expected_sessions', v_subscription_record.session_count
    );
  END IF;
  
  -- Delete any existing sessions first to avoid duplicates
  DELETE FROM lesson_sessions WHERE subscription_id = p_subscription_id;
  
  -- Generate sessions
  BEGIN
    PERFORM generate_lesson_sessions_v2(p_subscription_id);
    
    -- Count created sessions
    SELECT COUNT(*) INTO v_existing_sessions_count
    FROM lesson_sessions
    WHERE subscription_id = p_subscription_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Sessions regenerated successfully',
      'sessions_created', v_existing_sessions_count
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      RETURN json_build_object(
        'success', false,
        'message', 'Error regenerating sessions: ' || v_error_msg
      );
  END;
END;
$function$;

-- Add a function to check subscription and session status
CREATE OR REPLACE FUNCTION public.check_subscription_sessions(p_subscription_id uuid)
RETURNS TABLE(
  subscription_id uuid,
  student_id uuid,
  session_count_expected integer,
  session_count_actual integer,
  schedule_valid boolean,
  start_date date,
  status text,
  error_details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_subscription public.subscriptions;
  v_actual_count integer;
  v_schedule_valid boolean := false;
  v_error_details text := '';
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF v_subscription.id IS NULL THEN
    RETURN QUERY SELECT 
      p_subscription_id,
      NULL::uuid,
      0,
      0,
      false,
      NULL::date,
      'Subscription not found'::text,
      'No subscription record found with this ID'::text;
    RETURN;
  END IF;
  
  -- Count actual sessions
  SELECT COUNT(*) INTO v_actual_count
  FROM lesson_sessions
  WHERE subscription_id = p_subscription_id;
  
  -- Check if schedule is valid
  BEGIN
    v_schedule_valid := (
      v_subscription.schedule IS NOT NULL AND 
      jsonb_array_length(v_subscription.schedule) > 0
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_schedule_valid := false;
      v_error_details := v_error_details || 'Invalid schedule format. ';
  END;
  
  -- Add more error details
  IF v_subscription.session_count <= 0 THEN
    v_error_details := v_error_details || 'Invalid session count. ';
  END IF;
  
  IF v_subscription.start_date IS NULL THEN
    v_error_details := v_error_details || 'Missing start date. ';
  END IF;
  
  RETURN QUERY SELECT 
    v_subscription.id,
    v_subscription.student_id,
    v_subscription.session_count,
    v_actual_count,
    v_schedule_valid,
    v_subscription.start_date,
    v_subscription.status,
    CASE 
      WHEN v_error_details = '' THEN 'OK'
      ELSE v_error_details
    END;
END;
$function$;
