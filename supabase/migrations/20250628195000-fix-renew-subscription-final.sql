
-- Final fix for renew_subscription function - use exact same validation pattern as working functions
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
  -- Use the exact same validation pattern as get_student_subscriptions and other working functions
  -- Get subscription and verify school access in one query
  SELECT s.*
  INTO v_current_sub
  FROM subscriptions s
  INNER JOIN students st ON s.student_id = st.id
  WHERE s.id = p_subscription_id
    AND st.school_id = p_current_school_id;
  
  -- If no record found, it means either subscription doesn't exist or user doesn't have access
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
