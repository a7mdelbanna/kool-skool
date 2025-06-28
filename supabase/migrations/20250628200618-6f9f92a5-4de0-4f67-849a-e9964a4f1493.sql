
-- Create a comprehensive debugging version of renew_subscription with detailed logging
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
  v_debug_info jsonb := '{}';
BEGIN
  -- Log the input parameters
  RAISE NOTICE 'renew_subscription called with subscription_id=%, user_id=%, school_id=%', 
    p_subscription_id, p_current_user_id, p_current_school_id;
  
  -- Step 1: Check if subscription exists in database
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  IF v_subscription.id IS NULL THEN
    RAISE NOTICE 'FAILURE: Subscription with ID % does not exist in database', p_subscription_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found in database',
      'debug', jsonb_build_object(
        'subscription_id', p_subscription_id,
        'check', 'subscription_exists',
        'result', 'not_found'
      )
    );
  END IF;
  
  RAISE NOTICE 'SUCCESS: Found subscription id=%, student_id=%, status=%', 
    v_subscription.id, v_subscription.student_id, v_subscription.status;
  
  -- Step 2: Check if student exists and get their school_id
  SELECT * INTO v_student
  FROM public.students
  WHERE id = v_subscription.student_id;
  
  IF v_student.id IS NULL THEN
    RAISE NOTICE 'FAILURE: Student with ID % does not exist in database', v_subscription.student_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Student not found in database',
      'debug', jsonb_build_object(
        'subscription_id', p_subscription_id,
        'student_id', v_subscription.student_id,
        'check', 'student_exists',
        'result', 'not_found'
      )
    );
  END IF;
  
  RAISE NOTICE 'SUCCESS: Found student id=%, school_id=%', 
    v_student.id, v_student.school_id;
  
  -- Step 3: Check school ownership - THIS IS THE CRITICAL CHECK
  RAISE NOTICE 'SCHOOL OWNERSHIP CHECK: student.school_id=%, requested_school_id=%, match=%', 
    v_student.school_id, p_current_school_id, (v_student.school_id = p_current_school_id);
  
  IF v_student.school_id != p_current_school_id THEN
    RAISE NOTICE 'FAILURE: School mismatch - student belongs to school %, but request is from school %', 
      v_student.school_id, p_current_school_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied - student belongs to different school',
      'debug', jsonb_build_object(
        'subscription_id', p_subscription_id,
        'student_id', v_subscription.student_id,
        'student_school_id', v_student.school_id,
        'requested_school_id', p_current_school_id,
        'check', 'school_ownership',
        'result', 'mismatch'
      )
    );
  END IF;
  
  RAISE NOTICE 'SUCCESS: School ownership validated';
  
  -- Step 4: Calculate new dates
  v_new_start_date := GREATEST(
    COALESCE(v_subscription.end_date, v_subscription.start_date + (v_subscription.duration_months || ' months')::INTERVAL),
    CURRENT_DATE
  );
  
  v_new_end_date := v_new_start_date + (v_subscription.duration_months || ' months')::INTERVAL;
  
  RAISE NOTICE 'Calculated dates: start_date=%, end_date=%', v_new_start_date, v_new_end_date;
  
  -- Step 5: Create new subscription
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
  
  RAISE NOTICE 'SUCCESS: Created new subscription with ID %', v_new_subscription_id;
  
  -- Step 6: Generate lesson sessions
  BEGIN
    PERFORM generate_lesson_sessions_v2(v_new_subscription_id);
    RAISE NOTICE 'SUCCESS: Generated lesson sessions for subscription %', v_new_subscription_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'WARNING: Failed to generate lesson sessions: %', SQLERRM;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription renewed successfully',
    'new_subscription_id', v_new_subscription_id,
    'new_start_date', v_new_start_date,
    'new_end_date', v_new_end_date,
    'debug', jsonb_build_object(
      'original_subscription_id', p_subscription_id,
      'student_id', v_subscription.student_id,
      'student_school_id', v_student.school_id,
      'requested_school_id', p_current_school_id,
      'all_checks', 'passed'
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'CRITICAL ERROR in renew_subscription: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to renew subscription: ' || SQLERRM,
      'debug', jsonb_build_object(
        'error', SQLERRM,
        'subscription_id', p_subscription_id,
        'user_id', p_current_user_id,
        'school_id', p_current_school_id,
        'stage', 'exception_handler'
      )
    );
END;
$$;

-- Create a function to directly test the subscription and school relationship
CREATE OR REPLACE FUNCTION debug_subscription_access(
  p_subscription_id UUID,
  p_school_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
  v_student RECORD;
BEGIN
  -- Get subscription details
  SELECT * INTO v_subscription FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'subscription_found', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Get student details
  SELECT * INTO v_student FROM public.students WHERE id = v_subscription.student_id;
  
  IF v_student.id IS NULL THEN
    RETURN jsonb_build_object(
      'subscription_found', true,
      'student_found', false,
      'message', 'Student not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'subscription_found', true,
    'student_found', true,
    'subscription_id', v_subscription.id,
    'subscription_student_id', v_subscription.student_id,
    'subscription_status', v_subscription.status,
    'student_id', v_student.id,
    'student_school_id', v_student.school_id,
    'requested_school_id', p_school_id,
    'school_match', (v_student.school_id = p_school_id),
    'access_allowed', (v_student.school_id = p_school_id)
  );
END;
$$;
