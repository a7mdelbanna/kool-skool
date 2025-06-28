
-- Fix renew_subscription with direct validation approach
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
  v_student_school_id UUID;
  v_new_start_date DATE;
  v_new_end_date DATE;
  v_new_subscription_id UUID;
BEGIN
  -- Step 1: Get subscription directly (no JOIN complexity)
  SELECT * INTO v_current_sub
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  -- Step 2: Check if subscription exists
  IF v_current_sub.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Step 3: Get the school_id of the student who owns this subscription
  SELECT school_id INTO v_student_school_id
  FROM students
  WHERE id = v_current_sub.student_id;
  
  -- Step 4: Check if student belongs to the requesting school
  IF v_student_school_id IS NULL OR v_student_school_id != p_current_school_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied - subscription does not belong to your school'
    );
  END IF;
  
  -- Step 5: Calculate new dates
  BEGIN
    v_new_start_date := calculate_next_subscription_start_date(p_subscription_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback calculation
      v_new_start_date := COALESCE(v_current_sub.end_date, v_current_sub.start_date + (v_current_sub.duration_months || ' months')::INTERVAL) + 1;
  END;
  
  v_new_end_date := v_new_start_date + (v_current_sub.duration_months || ' months')::INTERVAL;
  
  -- Step 6: Create new subscription
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
  
  -- Step 7: Generate lesson sessions
  BEGIN
    PERFORM generate_lesson_sessions_v2(v_new_subscription_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue even if session generation fails
      NULL;
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
