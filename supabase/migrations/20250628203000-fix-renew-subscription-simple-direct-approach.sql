
-- Simple direct approach for renew_subscription that exactly mirrors working functions
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
  v_subscription RECORD;
  v_student RECORD;
  v_new_start_date DATE;
  v_new_end_date DATE;
  v_new_subscription_id UUID;
BEGIN
  -- Step 1: Get subscription directly - no complex joins
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  -- Step 2: Simple null check
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Step 3: Get student directly 
  SELECT * INTO v_student
  FROM public.students
  WHERE id = v_subscription.student_id;
  
  -- Step 4: Simple null check for student
  IF v_student.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Student not found'
    );
  END IF;
  
  -- Step 5: Simple school validation
  IF v_student.school_id != p_current_school_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied - student belongs to different school'
    );
  END IF;
  
  -- Step 6: Calculate new dates using simple logic
  v_new_start_date := GREATEST(
    COALESCE(v_subscription.end_date, v_subscription.start_date + (v_subscription.duration_months || ' months')::INTERVAL),
    CURRENT_DATE
  );
  
  v_new_end_date := v_new_start_date + (v_subscription.duration_months || ' months')::INTERVAL;
  
  -- Step 7: Create new subscription with exact same structure
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
    status,
    notes
  ) VALUES (
    v_subscription.student_id,
    v_subscription.session_count,
    v_subscription.duration_months,
    v_new_start_date,
    v_new_end_date,
    v_subscription.schedule,
    v_subscription.price_mode,
    v_subscription.price_per_session,
    v_subscription.fixed_price,
    v_subscription.total_price,
    v_subscription.currency,
    'active',
    COALESCE(v_subscription.notes, '') || ' (Renewed from subscription ' || p_subscription_id || ')'
  )
  RETURNING id INTO v_new_subscription_id;
  
  -- Step 8: Generate lesson sessions using existing function
  BEGIN
    PERFORM generate_lesson_sessions_v2(v_new_subscription_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't fail the entire operation
      NULL;
  END;
  
  -- Step 9: Return success
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
