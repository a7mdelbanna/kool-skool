
-- Fix the update_subscription_with_related_data function to properly handle schedule parameter
CREATE OR REPLACE FUNCTION public.update_subscription_with_related_data(
  p_subscription_id uuid,
  p_session_count integer,
  p_duration_months integer,
  p_start_date date,
  p_schedule jsonb,
  p_price_mode text,
  p_price_per_session numeric,
  p_fixed_price numeric,
  p_total_price numeric,
  p_currency text,
  p_notes text,
  p_status text,
  p_current_user_id uuid,
  p_current_school_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  subscription_record public.subscriptions;
  student_record public.students;
  parsed_schedule jsonb;
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
      'message', 'Only admins and teachers can update subscriptions'
    );
  END IF;
  
  -- Get the subscription record and verify it exists
  SELECT * INTO subscription_record FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Verify the student belongs to the same school
  SELECT * INTO student_record FROM public.students WHERE id = subscription_record.student_id;
  
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
  
  -- Parse the schedule parameter safely
  BEGIN
    -- If p_schedule is already a JSONB array, use it directly
    -- If it's a JSON string, parse it
    IF jsonb_typeof(p_schedule) = 'array' THEN
      parsed_schedule := p_schedule;
    ELSE
      -- Try to parse as JSON string
      parsed_schedule := p_schedule::jsonb;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid schedule format: ' || SQLERRM
      );
  END;
  
  -- Update the subscription
  UPDATE public.subscriptions
  SET 
    session_count = p_session_count,
    duration_months = p_duration_months,
    start_date = p_start_date,
    schedule = parsed_schedule,
    price_mode = p_price_mode,
    price_per_session = p_price_per_session,
    fixed_price = p_fixed_price,
    total_price = p_total_price,
    currency = p_currency,
    notes = p_notes,
    status = p_status,
    updated_at = now()
  WHERE id = p_subscription_id;
  
  -- Recalculate subscription progress
  PERFORM public.recalculate_subscription_progress(p_subscription_id);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription updated successfully'
  );
END;
$function$;
