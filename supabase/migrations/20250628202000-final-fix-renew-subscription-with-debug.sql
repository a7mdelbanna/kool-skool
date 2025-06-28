
-- Final fix for renew_subscription with comprehensive debugging and error handling
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
  v_student_record RECORD;
  v_new_start_date DATE;
  v_new_end_date DATE;
  v_new_subscription_id UUID;
  v_debug_info jsonb := '{}';
BEGIN
  -- Add debug logging
  RAISE NOTICE 'renew_subscription called with: subscription_id=%, user_id=%, school_id=%', 
    p_subscription_id, p_current_user_id, p_current_school_id;
  
  -- Step 1: Get subscription directly with explicit public schema
  SELECT * INTO v_current_sub
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  -- Debug: Check if subscription was found
  IF v_current_sub.id IS NULL THEN
    RAISE NOTICE 'Subscription not found with ID: %', p_subscription_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found',
      'debug', jsonb_build_object('subscription_id', p_subscription_id)
    );
  END IF;
  
  RAISE NOTICE 'Found subscription: id=%, student_id=%', v_current_sub.id, v_current_sub.student_id;
  
  -- Step 2: Get student record and verify school ownership
  SELECT * INTO v_student_record
  FROM public.students
  WHERE id = v_current_sub.student_id;
  
  -- Debug: Check if student was found
  IF v_student_record.id IS NULL THEN
    RAISE NOTICE 'Student not found with ID: %', v_current_sub.student_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Student not found for this subscription',
      'debug', jsonb_build_object(
        'subscription_id', p_subscription_id,
        'student_id', v_current_sub.student_id
      )
    );
  END IF;
  
  RAISE NOTICE 'Found student: id=%, school_id=%', v_student_record.id, v_student_record.school_id;
  
  -- Step 3: Verify school ownership
  IF v_student_record.school_id != p_current_school_id THEN
    RAISE NOTICE 'School mismatch: student_school=%, requested_school=%', 
      v_student_record.school_id, p_current_school_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied - subscription does not belong to your school',
      'debug', jsonb_build_object(
        'student_school_id', v_student_record.school_id,
        'requested_school_id', p_current_school_id
      )
    );
  END IF;
  
  -- Step 4: Calculate new dates
  BEGIN
    v_new_start_date := calculate_next_subscription_start_date(p_subscription_id);
    RAISE NOTICE 'Calculated start date using helper function: %', v_new_start_date;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback calculation
      v_new_start_date := COALESCE(v_current_sub.end_date, v_current_sub.start_date + (v_current_sub.duration_months || ' months')::INTERVAL) + 1;
      RAISE NOTICE 'Used fallback start date calculation: %', v_new_start_date;
  END;
  
  v_new_end_date := v_new_start_date + (v_current_sub.duration_months || ' months')::INTERVAL;
  RAISE NOTICE 'Calculated end date: %', v_new_end_date;
  
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
  
  RAISE NOTICE 'Created new subscription with ID: %', v_new_subscription_id;
  
  -- Step 6: Generate lesson sessions
  BEGIN
    PERFORM generate_lesson_sessions_v2(v_new_subscription_id);
    RAISE NOTICE 'Successfully generated lesson sessions for subscription: %', v_new_subscription_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue even if session generation fails
      RAISE NOTICE 'Failed to generate lesson sessions: %', SQLERRM;
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
    RAISE NOTICE 'Unexpected error in renew_subscription: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to renew subscription: ' || SQLERRM,
      'debug', jsonb_build_object(
        'error', SQLERRM,
        'subscription_id', p_subscription_id,
        'user_id', p_current_user_id,
        'school_id', p_current_school_id
      )
    );
END;
$$;

-- Also create a simple test function to verify the subscription exists
CREATE OR REPLACE FUNCTION test_subscription_access(
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
  -- Test subscription lookup
  SELECT * INTO v_subscription FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'subscription_found', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Test student lookup
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
    'school_match', v_student.school_id = p_school_id,
    'subscription_student_id', v_subscription.student_id,
    'student_school_id', v_student.school_id,
    'requested_school_id', p_school_id
  );
END;
$$;
