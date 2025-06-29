
-- Complete fix for all ambiguous column references in create_group_subscription function
CREATE OR REPLACE FUNCTION public.create_group_subscription(
  p_group_id uuid, 
  p_student_ids uuid[], 
  p_start_date date, 
  p_current_user_id uuid, 
  p_current_school_id uuid, 
  p_initial_payment_amount numeric DEFAULT 0, 
  p_payment_method text DEFAULT 'Cash'::text, 
  p_payment_account_id uuid DEFAULT NULL::uuid, 
  p_payment_notes text DEFAULT ''::text, 
  p_subscription_notes text DEFAULT ''::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  group_record public.groups;
  loop_student_id UUID; -- Renamed to avoid any ambiguity
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
  subscription_ids UUID[] := '{}';
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
    RETURN json_build_object('success', false, 'message', 'Only admins and teachers can create group subscriptions');
  END IF;
  
  -- Get group record
  SELECT * INTO group_record FROM public.groups WHERE groups.id = p_group_id;
  
  IF group_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Group not found');
  END IF;
  
  IF group_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'Group does not belong to your school');
  END IF;
  
  -- Calculate session cost
  IF group_record.price_mode = 'perSession' THEN
    session_cost := COALESCE(group_record.price_per_session, 0);
  ELSE
    session_cost := COALESCE(group_record.total_price / group_record.session_count, 0);
  END IF;
  
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
  
  -- Create subscription and sessions for each student
  FOREACH loop_student_id IN ARRAY p_student_ids -- Use clearly renamed variable
  LOOP
    -- Verify student exists and belongs to the school
    SELECT * INTO student_record FROM public.students WHERE students.id = loop_student_id;
    
    IF student_record.id IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Student not found: ' || loop_student_id);
    END IF;
    
    IF student_record.school_id != p_current_school_id THEN
      RETURN json_build_object('success', false, 'message', 'Student does not belong to your school: ' || loop_student_id);
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
      loop_student_id, -- Use renamed variable
      p_group_id,
      'group',
      group_record.session_count,
      1, -- Default to 1 month, can be adjusted
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
    
    subscription_ids := array_append(subscription_ids, new_subscription_id);
    
    -- Add student to group
    INSERT INTO public.group_students (group_id, student_id, start_date)
    VALUES (p_group_id, loop_student_id, p_start_date) -- Use renamed variable
    ON CONFLICT (group_id, student_id) DO NOTHING;
    
    -- Create sessions for this student
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
      
      -- Insert the session with explicit variable references
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
        loop_student_id, -- Use renamed variable to eliminate ambiguity
        p_group_id,
        session_datetime,
        60, -- Default 60 minutes
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
        NULL, -- no contact_id for group payments
        NULL, -- no category_id for now
        NULL, -- no from_account_id
        p_payment_account_id, -- to_account_id
        p_payment_method,
        NULL, -- no receipt_number
        NULL, -- no receipt_url
        0, -- no tax_amount
        0, -- no tax_rate
        false, -- not recurring
        NULL, -- no recurring_frequency
        NULL, -- no recurring_end_date
        NULL -- no tag_ids
      ) INTO transaction_id;
      
      -- Link the transaction to the subscription
      UPDATE public.transactions 
      SET subscription_id = new_subscription_id
      WHERE transactions.id = transaction_id;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Group subscriptions created successfully',
    'subscription_ids', subscription_ids,
    'students_count', array_length(p_student_ids, 1)
  );
END;
$function$;
