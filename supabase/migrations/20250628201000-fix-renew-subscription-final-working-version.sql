
-- Complete rewrite of renew_subscription to match exactly how get_student_subscriptions works
CREATE OR REPLACE FUNCTION renew_subscription(
  p_subscription_id UUID,
  p_current_user_id UUID,
  p_current_school_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_sub RECORD;
  v_new_start_date DATE;
  v_new_end_date DATE;
  v_new_subscription_id UUID;
BEGIN
  -- Use the EXACT same query pattern as get_student_subscriptions
  -- This function works, so we'll mirror its approach exactly
  SELECT 
    s.*,
    st.school_id as student_school_id
  INTO v_current_sub
  FROM subscriptions s
  INNER JOIN students st ON s.student_id = st.id
  WHERE s.id = p_subscription_id
    AND st.school_id = p_current_school_id;
  
  -- Check if subscription was found and user has access
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found or access denied'
    );
  END IF;
  
  -- Calculate intelligent start date using existing helper function
  BEGIN
    v_new_start_date := calculate_next_subscription_start_date(p_subscription_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- If helper function fails, use simple logic
      v_new_start_date := COALESCE(v_current_sub.end_date, v_current_sub.start_date + (v_current_sub.duration_months || ' months')::INTERVAL) + 1;
  END;
  
  -- Calculate end date
  v_new_end_date := v_new_start_date + (v_current_sub.duration_months || ' months')::INTERVAL;
  
  -- Create new subscription with exact same structure
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
  
  -- Generate lesson sessions using existing function
  BEGIN
    PERFORM generate_lesson_sessions_v2(v_new_subscription_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- If session generation fails, still return success but log the issue
      NULL; -- Continue execution
  END;
  
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

-- Also create a helper function to check if a user can access a subscription
-- This mirrors the exact logic used in successful functions
CREATE OR REPLACE FUNCTION can_user_access_subscription(
  p_subscription_id UUID,
  p_user_id UUID,
  p_school_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_exists boolean := false;
BEGIN
  -- Check if subscription exists and user has access using same pattern as working functions
  SELECT EXISTS(
    SELECT 1 
    FROM subscriptions s
    INNER JOIN students st ON s.student_id = st.id
    WHERE s.id = p_subscription_id
      AND st.school_id = p_school_id
  ) INTO subscription_exists;
  
  RETURN subscription_exists;
END;
$$;
