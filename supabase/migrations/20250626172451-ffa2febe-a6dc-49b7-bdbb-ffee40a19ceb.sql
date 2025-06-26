
-- Add next payment date and amount columns to the students table
ALTER TABLE public.students 
ADD COLUMN next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN next_payment_amount NUMERIC;

-- Update the get_students_with_details function to include next payment information
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
  next_payment_amount numeric
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
    s.next_payment_amount
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
  -- Calculate total subscription costs for each student
  LEFT JOIN (
    SELECT 
      sub.student_id,
      SUM(sub.total_price) as total_cost
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

-- Create a function to calculate and update next payment information
CREATE OR REPLACE FUNCTION public.calculate_next_payment_info(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  last_subscription_record public.subscriptions;
  last_session_date TIMESTAMP WITH TIME ZONE;
  calculated_next_payment_date TIMESTAMP WITH TIME ZONE;
  calculated_next_payment_amount NUMERIC;
  schedule_item JSONB;
  sorted_schedule JSONB[];
  target_day_of_week INTEGER;
  day_of_week INTEGER;
  days_to_add INTEGER;
  session_time TEXT;
  base_date DATE;
  potential_date TIMESTAMP WITH TIME ZONE;
  i INTEGER;
BEGIN
  -- Get the most recent active subscription for this student
  SELECT * INTO last_subscription_record 
  FROM public.subscriptions 
  WHERE student_id = p_student_id 
  AND status = 'active'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- If no subscription found, clear next payment info and return
  IF last_subscription_record.id IS NULL THEN
    UPDATE public.students 
    SET next_payment_date = NULL, next_payment_amount = NULL
    WHERE id = p_student_id;
    RETURN;
  END IF;
  
  -- Get the date of the last scheduled session for this subscription
  SELECT MAX(scheduled_date) INTO last_session_date
  FROM public.lesson_sessions
  WHERE subscription_id = last_subscription_record.id;
  
  -- If no sessions found, use subscription start date
  IF last_session_date IS NULL THEN
    last_session_date := last_subscription_record.start_date::TIMESTAMP WITH TIME ZONE;
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
  FROM jsonb_array_elements(last_subscription_record.schedule);
  
  -- Start from the day after the last session
  base_date := (last_session_date + INTERVAL '1 day')::DATE;
  
  -- Find the next occurrence of any scheduled day
  calculated_next_payment_date := NULL;
  
  -- Check each day in the schedule to find the earliest next occurrence
  FOR i IN 1..array_length(sorted_schedule, 1) LOOP
    schedule_item := sorted_schedule[i];
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
    
    -- Calculate the potential next payment date
    potential_date := (base_date + days_to_add)::DATE + session_time::TIME;
    
    -- Keep the earliest date
    IF calculated_next_payment_date IS NULL OR potential_date < calculated_next_payment_date THEN
      calculated_next_payment_date := potential_date;
    END IF;
  END LOOP;
  
  -- Set the payment amount based on subscription total price
  calculated_next_payment_amount := last_subscription_record.total_price;
  
  -- Update the student record with calculated next payment info
  UPDATE public.students 
  SET 
    next_payment_date = calculated_next_payment_date,
    next_payment_amount = calculated_next_payment_amount
  WHERE id = p_student_id;
END;
$function$;

-- Create a trigger function to automatically calculate next payment info
CREATE OR REPLACE FUNCTION public.trigger_calculate_next_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Handle different trigger scenarios
  IF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_next_payment_info(OLD.student_id);
    RETURN OLD;
  ELSE
    PERFORM public.calculate_next_payment_info(NEW.student_id);
    RETURN NEW;
  END IF;
END;
$function$;

-- Create trigger on subscriptions table
DROP TRIGGER IF EXISTS calculate_next_payment_on_subscription ON public.subscriptions;
CREATE TRIGGER calculate_next_payment_on_subscription
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_next_payment();

-- Create trigger on lesson_sessions table to recalculate when sessions are updated
DROP TRIGGER IF EXISTS calculate_next_payment_on_session_update ON public.lesson_sessions;
CREATE TRIGGER calculate_next_payment_on_session_update
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_next_payment();

-- Update existing students to calculate their next payment info
DO $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN SELECT id FROM public.students LOOP
    PERFORM public.calculate_next_payment_info(student_record.id);
  END LOOP;
END $$;
