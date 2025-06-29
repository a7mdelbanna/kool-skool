
-- Add function to add student to existing group
CREATE OR REPLACE FUNCTION public.add_student_to_group(
  p_group_id UUID,
  p_student_id UUID,
  p_start_date DATE,
  p_current_user_id UUID,
  p_current_school_id UUID,
  p_initial_payment_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'Cash',
  p_payment_account_id UUID DEFAULT NULL,
  p_payment_notes TEXT DEFAULT '',
  p_subscription_notes TEXT DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  group_record public.groups;
  student_record public.students;
  new_subscription_id UUID;
  session_cost NUMERIC;
  schedule_item JSONB;
  sorted_schedule JSONB[];
  base_date DATE;
  session_datetime TIMESTAMP WITH TIME ZONE;
  sessions_created INTEGER := 0;
  schedule_cycle_index INTEGER := 0;
  day_of_week INTEGER;
  target_day_of_week INTEGER;
  days_to_add INTEGER;
  session_time TEXT;
  current_session_date DATE;
  transaction_id UUID;
BEGIN
  -- Validate user permissions
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'User school mismatch');
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RETURN json_build_object('success', false, 'message', 'Only admins and teachers can add students to groups');
  END IF;
  
  -- Get group record
  SELECT * INTO group_record FROM public.groups WHERE groups.id = p_group_id;
  
  IF group_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Group not found');
  END IF;
  
  IF group_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'Group does not belong to your school');
  END IF;
  
  -- Verify student exists and belongs to the school
  SELECT * INTO student_record FROM public.students WHERE students.id = p_student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Student not found');
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'Student does not belong to your school');
  END IF;
  
  -- Check if student is already in this group
  IF EXISTS (SELECT 1 FROM public.group_students WHERE group_id = p_group_id AND student_id = p_student_id AND status = 'active') THEN
    RETURN json_build_object('success', false, 'message', 'Student is already in this group');
  END IF;
  
  -- Calculate session cost
  IF group_record.price_mode = 'perSession' THEN
    session_cost := COALESCE(group_record.price_per_session, 0);
  ELSE
    session_cost := COALESCE(group_record.total_price / group_record.session_count, 0);
  END IF;
  
  -- Create subscription
  INSERT INTO public.subscriptions (
    student_id,
    group_id,
    subscription_type,
    session_count,
    duration_months,
    start_date,
    schedule,
    price_mode,
    price_per_session,
    fixed_price,
    total_price,
    currency,
    notes,
    status
  ) VALUES (
    p_student_id,
    p_group_id,
    'group',
    group_record.session_count,
    1,
    p_start_date,
    group_record.schedule,
    group_record.price_mode,
    group_record.price_per_session,
    group_record.total_price,
    group_record.total_price,
    group_record.currency,
    p_subscription_notes,
    'active'
  ) RETURNING subscriptions.id INTO new_subscription_id;
  
  -- Add student to group
  INSERT INTO public.group_students (group_id, student_id, start_date, status)
  VALUES (p_group_id, p_student_id, p_start_date, 'active')
  ON CONFLICT (group_id, student_id) DO UPDATE SET 
    status = 'active',
    start_date = p_start_date;
  
  -- Convert schedule JSONB to array and sort by day of week
  SELECT array_agg(value ORDER BY 
    CASE value ->> 'day'
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
      WHEN 'Sunday' THEN 7
    END
  ) INTO sorted_schedule
  FROM jsonb_array_elements(group_record.schedule);
  
  -- Create sessions for this student starting from their start date
  base_date := p_start_date;
  sessions_created := 0;
  
  WHILE sessions_created < group_record.session_count LOOP
    -- Get the current schedule item (cycle through the array)
    schedule_cycle_index := (sessions_created % array_length(sorted_schedule, 1)) + 1;
    schedule_item := sorted_schedule[schedule_cycle_index];
    session_time := schedule_item ->> 'time';
    
    -- Convert day name to day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    target_day_of_week := CASE schedule_item ->> 'day'
      WHEN 'Sunday' THEN 0
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
    END;
    
    -- Find the next occurrence of this day starting from base_date
    day_of_week := EXTRACT(DOW FROM base_date);
    
    -- Calculate days to add to get to target day
    IF target_day_of_week >= day_of_week THEN
      days_to_add := target_day_of_week - day_of_week;
    ELSE
      days_to_add := 7 - day_of_week + target_day_of_week;
    END IF;
    
    -- Calculate the session date
    current_session_date := base_date + days_to_add;
    
    -- Create session datetime
    session_datetime := current_session_date::DATE + session_time::TIME;
    
    -- Insert the session with the group's session duration
    INSERT INTO public.lesson_sessions (
      subscription_id,
      student_id,
      group_id,
      scheduled_date,
      duration_minutes,
      status,
      payment_status,
      cost,
      notes,
      index_in_sub
    ) VALUES (
      new_subscription_id,
      p_student_id,
      p_group_id,
      session_datetime,
      group_record.session_duration_minutes,
      'scheduled',
      'paid',
      session_cost,
      'Group session ' || (sessions_created + 1) || ' of ' || group_record.session_count,
      sessions_created + 1
    );
    
    sessions_created := sessions_created + 1;
    
    -- Move base_date forward by 1 day after creating each session
    base_date := current_session_date + 1;
    
    -- Safety check to prevent infinite loop
    IF base_date > p_start_date + INTERVAL '1 year' THEN
      RAISE EXCEPTION 'Unable to schedule sessions - check schedule configuration';
    END IF;
  END LOOP;
  
  -- Create initial payment if amount > 0
  IF p_initial_payment_amount > 0 AND p_payment_account_id IS NOT NULL THEN
    SELECT public.create_transaction(
      p_current_school_id,
      'income',
      p_initial_payment_amount,
      group_record.currency,
      p_start_date,
      'Initial payment for group subscription',
      p_payment_notes,
      NULL,
      NULL,
      NULL,
      p_payment_account_id,
      p_payment_method,
      NULL,
      NULL,
      0,
      0,
      false,
      NULL,
      NULL,
      NULL
    ) INTO transaction_id;
    
    -- Link the transaction to the subscription
    UPDATE public.transactions 
    SET subscription_id = new_subscription_id
    WHERE transactions.id = transaction_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Student added to group successfully',
    'subscription_id', new_subscription_id
  );
END;
$function$;

-- Add function to remove student from group
CREATE OR REPLACE FUNCTION public.remove_student_from_group(
  p_group_id UUID,
  p_student_id UUID,
  p_current_user_id UUID,
  p_current_school_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  group_record public.groups;
  student_record public.students;
BEGIN
  -- Validate user permissions
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'User school mismatch');
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RETURN json_build_object('success', false, 'message', 'Only admins and teachers can remove students from groups');
  END IF;
  
  -- Get group record
  SELECT * INTO group_record FROM public.groups WHERE groups.id = p_group_id;
  
  IF group_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Group not found');
  END IF;
  
  IF group_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'Group does not belong to your school');
  END IF;
  
  -- Verify student exists and belongs to the school
  SELECT * INTO student_record FROM public.students WHERE students.id = p_student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Student not found');
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'Student does not belong to your school');
  END IF;
  
  -- Check if student is in this group
  IF NOT EXISTS (SELECT 1 FROM public.group_students WHERE group_id = p_group_id AND student_id = p_student_id AND status = 'active') THEN
    RETURN json_build_object('success', false, 'message', 'Student is not in this group');
  END IF;
  
  -- Mark student as inactive in group (instead of deleting)
  UPDATE public.group_students 
  SET status = 'inactive', end_date = CURRENT_DATE
  WHERE group_id = p_group_id AND student_id = p_student_id;
  
  -- Mark group subscriptions as inactive
  UPDATE public.subscriptions 
  SET status = 'inactive'
  WHERE group_id = p_group_id AND student_id = p_student_id AND status = 'active';
  
  -- Mark future scheduled sessions as cancelled
  UPDATE public.lesson_sessions 
  SET status = 'cancelled', payment_status = 'refunded'
  WHERE group_id = p_group_id 
    AND student_id = p_student_id 
    AND status = 'scheduled' 
    AND scheduled_date > NOW();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Student removed from group successfully'
  );
END;
$function$;
