
-- Add a column to track subscription completion progress
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add a column to track the original session index and whether it counts toward completion
ALTER TABLE public.lesson_sessions 
ADD COLUMN IF NOT EXISTS counts_toward_completion BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS original_session_index INTEGER,
ADD COLUMN IF NOT EXISTS moved_from_session_id UUID REFERENCES public.lesson_sessions(id);

-- Update end_date for existing subscriptions based on their schedule and session count
UPDATE public.subscriptions 
SET end_date = start_date + INTERVAL '1 month' * duration_months
WHERE end_date IS NULL;

-- Function to recalculate subscription progress and end date
CREATE OR REPLACE FUNCTION public.recalculate_subscription_progress(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  subscription_record public.subscriptions;
  completed_sessions INTEGER;
  total_sessions INTEGER;
  last_session_date TIMESTAMP WITH TIME ZONE;
  new_end_date DATE;
BEGIN
  -- Get subscription record
  SELECT * INTO subscription_record FROM public.subscriptions WHERE id = p_subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Count completed sessions (attended or cancelled)
  SELECT COUNT(*) INTO completed_sessions
  FROM public.lesson_sessions
  WHERE subscription_id = p_subscription_id
    AND status IN ('completed', 'cancelled')
    AND counts_toward_completion = true;
  
  -- Get the date of the last scheduled session for this subscription
  SELECT MAX(scheduled_date) INTO last_session_date
  FROM public.lesson_sessions
  WHERE subscription_id = p_subscription_id;
  
  -- Calculate new end date based on the last session
  IF last_session_date IS NOT NULL THEN
    new_end_date := last_session_date::DATE;
  ELSE
    new_end_date := subscription_record.start_date + INTERVAL '1 month' * subscription_record.duration_months;
  END IF;
  
  -- Update subscription with new progress and end date
  UPDATE public.subscriptions
  SET 
    sessions_completed = completed_sessions,
    end_date = new_end_date
  WHERE id = p_subscription_id;
  
  -- Recalculate next payment info for the student
  PERFORM public.calculate_next_payment_info(subscription_record.student_id);
END;
$function$;

-- Function to handle session actions
CREATE OR REPLACE FUNCTION public.handle_session_action(
  p_session_id UUID,
  p_action TEXT, -- 'attended', 'cancelled', 'moved', 'rescheduled'
  p_new_datetime TIMESTAMP WITH TIME ZONE DEFAULT NULL -- For reschedule action
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  session_record public.lesson_sessions;
  subscription_record public.subscriptions;
  new_session_id UUID;
  next_available_slot TIMESTAMP WITH TIME ZONE;
  schedule_item JSONB;
  sorted_schedule JSONB[];
  base_date DATE;
  target_day_of_week INTEGER;
  day_of_week INTEGER;
  days_to_add INTEGER;
  session_time TEXT;
  i INTEGER;
BEGIN
  -- Get the session record
  SELECT * INTO session_record FROM public.lesson_sessions WHERE id = p_session_id;
  
  IF session_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Session not found'
    );
  END IF;
  
  -- Get the subscription record
  SELECT * INTO subscription_record FROM public.subscriptions WHERE id = session_record.subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Handle different actions
  CASE p_action
    WHEN 'attended' THEN
      UPDATE public.lesson_sessions
      SET 
        status = 'completed',
        counts_toward_completion = true
      WHERE id = p_session_id;
      
    WHEN 'cancelled' THEN
      UPDATE public.lesson_sessions
      SET 
        status = 'cancelled',
        counts_toward_completion = true,
        cost = 0 -- Cancelled sessions typically have no cost
      WHERE id = p_session_id;
      
    WHEN 'moved' THEN
      -- Mark current session as moved (doesn't count toward completion)
      UPDATE public.lesson_sessions
      SET 
        status = 'rescheduled',
        counts_toward_completion = false,
        notes = COALESCE(notes, '') || ' [Session moved - replacement created]'
      WHERE id = p_session_id;
      
      -- Find next available slot after subscription end date
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
      FROM jsonb_array_elements(subscription_record.schedule);
      
      -- Start from the day after the current subscription end date
      base_date := subscription_record.end_date + 1;
      
      -- Find the next available slot using the first scheduled day/time
      schedule_item := sorted_schedule[1];
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
      
      -- Find the next occurrence of this day
      day_of_week := EXTRACT(DOW FROM base_date);
      
      IF target_day_of_week >= day_of_week THEN
        days_to_add := target_day_of_week - day_of_week;
      ELSE
        days_to_add := 7 - day_of_week + target_day_of_week;
      END IF;
      
      next_available_slot := (base_date + days_to_add)::DATE + session_time::TIME;
      
      -- Create new session at the next available slot
      INSERT INTO public.lesson_sessions (
        subscription_id,
        student_id,
        scheduled_date,
        duration_minutes,
        status,
        payment_status,
        cost,
        notes,
        counts_toward_completion,
        original_session_index,
        moved_from_session_id
      ) VALUES (
        subscription_record.id,
        session_record.student_id,
        next_available_slot,
        session_record.duration_minutes,
        'scheduled',
        session_record.payment_status,
        session_record.cost,
        'Replacement session for moved session',
        true,
        session_record.index_in_sub,
        p_session_id
      ) RETURNING id INTO new_session_id;
      
    WHEN 'rescheduled' THEN
      IF p_new_datetime IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'message', 'New datetime required for reschedule action'
        );
      END IF;
      
      -- Update session to new date/time (doesn't count toward completion until attended)
      UPDATE public.lesson_sessions
      SET 
        scheduled_date = p_new_datetime,
        status = 'scheduled',
        counts_toward_completion = false,
        notes = COALESCE(notes, '') || ' [Rescheduled from ' || session_record.scheduled_date || ']'
      WHERE id = p_session_id;
      
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid action: ' || p_action
      );
  END CASE;
  
  -- Recalculate subscription progress and dates
  PERFORM public.recalculate_subscription_progress(subscription_record.id);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Session action completed: ' || p_action,
    'new_session_id', new_session_id
  );
END;
$function$;

-- Update the get_students_with_details function to include subscription progress
DROP FUNCTION IF EXISTS public.get_students_with_details(uuid);

CREATE OR REPLACE FUNCTION public.get_students_with_details(p_school_id uuid)
RETURNS TABLE(
  id uuid, 
  school_id uuid, 
  user_id uuid, 
  teacher_id uuid, 
  course_id uuid, 
  age_group text, 
  level text, 
  phone text, 
  created_at timestamp with time zone, 
  first_name text, 
  last_name text, 
  email text, 
  course_name text, 
  lesson_type text, 
  teacher_first_name text, 
  teacher_last_name text, 
  teacher_email text,
  payment_status text,
  lessons_count integer,
  next_session_date timestamp with time zone,
  next_payment_date timestamp with time zone,
  next_payment_amount numeric,
  subscription_progress text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.school_id,
    s.user_id,
    s.teacher_id,
    s.course_id,
    s.age_group,
    s.level,
    s.phone,
    s.created_at,
    u.first_name,
    u.last_name,
    u.email,
    c.name as course_name,
    c.lesson_type,
    t.first_name as teacher_first_name,
    t.last_name as teacher_last_name,
    t.email as teacher_email,
    -- Calculate payment status based on total payments vs total subscription costs
    CASE 
      WHEN COALESCE(payments.total_paid, 0) >= COALESCE(subscriptions.total_cost, 0) AND COALESCE(subscriptions.total_cost, 0) > 0 THEN 'paid'
      WHEN COALESCE(payments.total_paid, 0) > 0 AND COALESCE(subscriptions.total_cost, 0) > 0 THEN 'pending'
      WHEN COALESCE(subscriptions.total_cost, 0) > 0 THEN 'pending'
      ELSE 'pending'
    END as payment_status,
    -- Count total lessons/sessions for this student (cast to integer to match return type)
    COALESCE(sessions.total_sessions, 0)::integer as lessons_count,
    -- Get the next scheduled session date
    sessions.next_session_date,
    -- Return stored next payment date and amount
    s.next_payment_date,
    s.next_payment_amount,
    -- Show subscription progress (completed/total for active subscription)
    COALESCE(
      (subscriptions.sessions_completed::text || '/' || subscriptions.total_sessions::text),
      '0/0'
    ) as subscription_progress
  FROM public.students s
  LEFT JOIN public.users u ON s.user_id = u.id
  LEFT JOIN public.courses c ON s.course_id = c.id
  LEFT JOIN public.users t ON s.teacher_id = t.id
  -- Calculate total payments for each student
  LEFT JOIN (
    SELECT 
      sp.student_id,
      SUM(sp.amount) as total_paid
    FROM public.student_payments sp
    WHERE sp.status = 'completed'
    GROUP BY sp.student_id
  ) payments ON s.id = payments.student_id
  -- Calculate total subscription costs and get active subscription info
  LEFT JOIN (
    SELECT 
      sub.student_id,
      SUM(sub.total_price) as total_cost,
      MAX(sub.sessions_completed) as sessions_completed,
      MAX(sub.session_count) as total_sessions
    FROM public.subscriptions sub
    WHERE sub.status = 'active'
    GROUP BY sub.student_id
  ) subscriptions ON s.id = subscriptions.student_id
  -- Calculate sessions count and next session
  LEFT JOIN (
    SELECT 
      ls.student_id,
      COUNT(*)::integer as total_sessions,
      MIN(CASE WHEN ls.status = 'scheduled' AND ls.scheduled_date > NOW() THEN ls.scheduled_date END) as next_session_date
    FROM public.lesson_sessions ls
    GROUP BY ls.student_id
  ) sessions ON s.id = sessions.student_id
  WHERE s.school_id = p_school_id
  ORDER BY s.created_at DESC;
END;
$function$;

-- Function to get lesson sessions with enhanced information
DROP FUNCTION IF EXISTS public.get_lesson_sessions(uuid);

CREATE OR REPLACE FUNCTION public.get_lesson_sessions(p_student_id uuid)
RETURNS TABLE(
  id uuid, 
  subscription_id uuid, 
  student_id uuid, 
  scheduled_date timestamp with time zone, 
  duration_minutes integer, 
  status text, 
  payment_status text, 
  cost numeric, 
  notes text, 
  created_at timestamp with time zone,
  index_in_sub integer,
  counts_toward_completion boolean,
  original_session_index integer,
  moved_from_session_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.subscription_id,
    ls.student_id,
    ls.scheduled_date,
    ls.duration_minutes,
    ls.status,
    ls.payment_status,
    ls.cost,
    ls.notes,
    ls.created_at,
    ls.index_in_sub,
    COALESCE(ls.counts_toward_completion, true) as counts_toward_completion,
    ls.original_session_index,
    ls.moved_from_session_id
  FROM public.lesson_sessions ls
  WHERE ls.student_id = p_student_id
  ORDER BY ls.scheduled_date ASC;
END;
$function$;

-- Initialize existing sessions with proper values
UPDATE public.lesson_sessions 
SET 
  counts_toward_completion = true,
  original_session_index = index_in_sub
WHERE counts_toward_completion IS NULL;

-- Recalculate progress for all existing subscriptions
DO $$
DECLARE
  subscription_record RECORD;
BEGIN
  FOR subscription_record IN SELECT id FROM public.subscriptions WHERE status = 'active' LOOP
    PERFORM public.recalculate_subscription_progress(subscription_record.id);
  END LOOP;
END $$;
