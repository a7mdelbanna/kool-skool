
-- Create a function to intelligently calculate the next subscription start date
CREATE OR REPLACE FUNCTION calculate_next_subscription_start_date(
  p_current_subscription_id UUID
) 
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_sub RECORD;
  v_schedule_item JSONB;
  v_current_end_date DATE;
  v_days_of_week TEXT[];
  v_day_name TEXT;
  v_target_date DATE;
  v_current_dow INTEGER;
  v_target_dow INTEGER;
  v_days_to_add INTEGER;
  v_min_days_to_add INTEGER := 99;
  v_optimal_start_date DATE;
BEGIN
  -- Get current subscription details
  SELECT s.*, s.end_date, s.schedule
  INTO v_current_sub
  FROM subscriptions s
  WHERE s.id = p_current_subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;
  
  -- Use end_date if available, otherwise calculate from start_date + duration
  IF v_current_sub.end_date IS NOT NULL THEN
    v_current_end_date := v_current_sub.end_date;
  ELSE
    v_current_end_date := v_current_sub.start_date + (v_current_sub.duration_months || ' months')::INTERVAL;
  END IF;
  
  -- Extract days of the week from schedule JSONB
  v_days_of_week := ARRAY[]::TEXT[];
  
  FOR v_schedule_item IN SELECT * FROM jsonb_array_elements(v_current_sub.schedule)
  LOOP
    v_day_name := v_schedule_item->>'day';
    IF v_day_name IS NOT NULL THEN
      v_days_of_week := array_append(v_days_of_week, v_day_name);
    END IF;
  END LOOP;
  
  -- If no schedule found, start the day after end date
  IF array_length(v_days_of_week, 1) IS NULL THEN
    RETURN v_current_end_date + 1;
  END IF;
  
  -- Find the earliest day in the next week that matches the schedule
  v_target_date := v_current_end_date + 1; -- Start checking from day after end date
  
  FOREACH v_day_name IN ARRAY v_days_of_week
  LOOP
    -- Convert day name to PostgreSQL day of week (0=Sunday, 1=Monday, etc.)
    v_target_dow := CASE v_day_name
      WHEN 'Sunday' THEN 0
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
      ELSE 1 -- Default to Monday if unrecognized
    END;
    
    -- Get current day of week for target date
    v_current_dow := EXTRACT(DOW FROM v_target_date);
    
    -- Calculate days to add to get to target day
    v_days_to_add := (v_target_dow - v_current_dow + 7) % 7;
    
    -- If it's 0, it means today is the target day, so we want next week
    IF v_days_to_add = 0 THEN
      v_days_to_add := 7;
    END IF;
    
    -- Keep track of the earliest possible start date
    IF v_days_to_add < v_min_days_to_add THEN
      v_min_days_to_add := v_days_to_add;
      v_optimal_start_date := v_target_date + v_days_to_add;
    END IF;
  END LOOP;
  
  -- Return the optimal start date (earliest matching day)
  RETURN COALESCE(v_optimal_start_date, v_current_end_date + 1);
END;
$$;

-- Create a function to renew/prolongate a subscription
CREATE OR REPLACE FUNCTION renew_subscription(
  p_subscription_id UUID,
  p_current_user_id UUID,
  p_current_school_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_sub RECORD;
  v_new_start_date DATE;
  v_new_end_date DATE;
  v_new_subscription_id UUID;
  v_result jsonb;
BEGIN
  -- Get current subscription details
  SELECT s.*
  INTO v_current_sub
  FROM subscriptions s
  WHERE s.id = p_subscription_id
    AND EXISTS (
      SELECT 1 FROM students st 
      WHERE st.id = s.student_id 
      AND st.school_id = p_current_school_id
    );
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found or access denied'
    );
  END IF;
  
  -- Calculate intelligent start date
  v_new_start_date := calculate_next_subscription_start_date(p_subscription_id);
  
  -- Calculate end date
  v_new_end_date := v_new_start_date + (v_current_sub.duration_months || ' months')::INTERVAL;
  
  -- Create new subscription
  INSERT INTO subscriptions (
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
    status,
    notes
  ) VALUES (
    v_current_sub.student_id,
    v_current_sub.session_count,
    v_current_sub.duration_months,
    v_new_start_date,
    v_new_end_date,
    v_current_sub.schedule,
    v_current_sub.price_mode,
    v_current_sub.price_per_session,
    v_current_sub.fixed_price,
    v_current_sub.total_price,
    v_current_sub.currency,
    'active',
    COALESCE(v_current_sub.notes, '') || ' (Renewed from subscription ' || p_subscription_id || ')'
  )
  RETURNING id INTO v_new_subscription_id;
  
  -- Generate lesson sessions for the new subscription
  PERFORM generate_lesson_sessions_v2(v_new_subscription_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription renewed successfully',
    'new_subscription_id', v_new_subscription_id,
    'new_start_date', v_new_start_date,
    'new_end_date', v_new_end_date
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to renew subscription: ' || SQLERRM
    );
END;
$$;
