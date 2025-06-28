
-- Fix the renew_subscription function to fetch subscriptions the same way as SubscriptionsTab
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
  -- Fetch subscription using the same approach as SubscriptionsTab
  -- This matches the enhanced subscription fetching with payment and session data
  SELECT 
    s.*,
    COALESCE(payments.total_paid, 0) as total_paid,
    COALESCE(session_stats.sessions_completed, 0) as sessions_completed,
    COALESCE(session_stats.sessions_attended, 0) as sessions_attended,
    COALESCE(session_stats.sessions_cancelled, 0) as sessions_cancelled,
    COALESCE(session_stats.sessions_scheduled, 0) as sessions_scheduled
  INTO v_current_sub
  FROM subscriptions s
  -- Join with student to ensure school ownership
  INNER JOIN students st ON s.student_id = st.id
  -- Calculate total payments for this student (similar to SubscriptionsTab approach)
  LEFT JOIN (
    SELECT 
      sp.student_id,
      SUM(sp.amount) as total_paid
    FROM student_payments sp
    WHERE sp.status = 'completed'
    GROUP BY sp.student_id
  ) payments ON st.id = payments.student_id
  -- Calculate session statistics (similar to SubscriptionsTab approach)
  LEFT JOIN (
    SELECT 
      ls.subscription_id,
      COUNT(*) FILTER (WHERE ls.status IN ('completed', 'cancelled')) as sessions_completed,
      COUNT(*) FILTER (WHERE ls.status = 'completed') as sessions_attended,
      COUNT(*) FILTER (WHERE ls.status = 'cancelled') as sessions_cancelled,
      COUNT(*) FILTER (WHERE ls.status = 'scheduled' AND ls.scheduled_date > NOW()) as sessions_scheduled
    FROM lesson_sessions ls
    GROUP BY ls.subscription_id
  ) session_stats ON s.id = session_stats.subscription_id
  WHERE s.id = p_subscription_id
    AND st.school_id = p_current_school_id;
  
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
