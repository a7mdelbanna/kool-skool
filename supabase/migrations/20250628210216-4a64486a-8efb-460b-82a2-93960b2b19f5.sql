
-- Fix renew_subscription to generate sessions for the new subscription
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
BEGIN
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
  
  -- Create the renewed subscription
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
  
  -- Generate lesson sessions for the new subscription using the existing function
  PERFORM generate_lesson_sessions_v2(new_subscription_id);
  
  -- Update original subscription notes to indicate it was renewed
  UPDATE public.subscriptions 
  SET notes = COALESCE(notes, '') || ' (Renewed as subscription ' || new_subscription_id || ')'
  WHERE id = p_subscription_id;
  
  -- Recalculate next payment info for the student
  PERFORM public.calculate_next_payment_info(original_subscription.student_id);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription renewed successfully with sessions generated',
    'new_subscription_id', new_subscription_id
  );
END;
$function$;
