
-- Step 1: Clean up ALL duplicate sessions in the database first
WITH duplicate_sessions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, scheduled_date
      ORDER BY 
        CASE 
          WHEN notes LIKE '%Auto-generated from subscription%' THEN 1 
          ELSE 2 
        END,
        created_at ASC
    ) as rn
  FROM public.lesson_sessions
)
DELETE FROM public.lesson_sessions 
WHERE id IN (
  SELECT id FROM duplicate_sessions WHERE rn > 1
);

-- Step 2: Add a proper unique constraint using exact datetime
DROP INDEX IF EXISTS idx_lesson_sessions_unique_datetime_student;
DROP INDEX IF EXISTS idx_lesson_sessions_unique_date_student;

-- Create unique constraint on student_id and scheduled_date (exact datetime)
CREATE UNIQUE INDEX idx_lesson_sessions_unique_student_datetime 
ON public.lesson_sessions (student_id, scheduled_date);

-- Step 3: Completely rewrite the add_student_subscription function with bulletproof logic
CREATE OR REPLACE FUNCTION public.add_student_subscription(
  p_student_id uuid, 
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
RETURNS TABLE(
  id uuid, 
  student_id uuid, 
  session_count integer, 
  duration_months integer, 
  start_date date, 
  schedule jsonb, 
  price_mode text, 
  price_per_session numeric, 
  fixed_price numeric, 
  total_price numeric, 
  currency text, 
  notes text, 
  status text, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  student_record public.students;
  new_subscription_id UUID;
  schedule_item JSONB;
  session_time TEXT;
  session_cost NUMERIC;
  target_weekday INTEGER;
  start_weekday INTEGER;
  days_diff INTEGER;
  first_session_date DATE;
  session_datetime TIMESTAMP WITH TIME ZONE;
  i INTEGER;
  existing_count INTEGER;
BEGIN
  -- Validate current user
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RAISE EXCEPTION 'User school mismatch';
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Only admins and teachers can add subscriptions';
  END IF;
  
  -- Validate student
  SELECT * INTO student_record FROM public.students WHERE students.id = p_student_id;
  
  IF student_record.id IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RAISE EXCEPTION 'Student does not belong to your school';
  END IF;
  
  -- Create subscription
  INSERT INTO public.subscriptions (
    student_id,
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
    p_session_count,
    p_duration_months,
    p_start_date,
    p_schedule,
    p_price_mode,
    p_price_per_session,
    p_fixed_price,
    p_total_price,
    COALESCE(p_currency, 'USD'),
    p_notes,
    COALESCE(p_status, 'active')
  ) RETURNING subscriptions.id INTO new_subscription_id;
  
  -- Calculate session cost
  IF p_price_mode = 'perSession' THEN
    session_cost := COALESCE(p_price_per_session, 0);
  ELSE
    session_cost := COALESCE(p_total_price / p_session_count, 0);
  END IF;
  
  -- CRITICAL: Remove ALL existing sessions for this subscription
  DELETE FROM public.lesson_sessions WHERE subscription_id = new_subscription_id;
  
  -- Get the first schedule item
  SELECT jsonb_array_elements(p_schedule) INTO schedule_item LIMIT 1;
  
  IF schedule_item IS NOT NULL THEN
    session_time := schedule_item ->> 'time';
    
    -- Convert day name to weekday number (0=Monday, 6=Sunday)
    CASE schedule_item ->> 'day'
      WHEN 'Monday' THEN target_weekday := 0;
      WHEN 'Tuesday' THEN target_weekday := 1;
      WHEN 'Wednesday' THEN target_weekday := 2;
      WHEN 'Thursday' THEN target_weekday := 3;
      WHEN 'Friday' THEN target_weekday := 4;
      WHEN 'Saturday' THEN target_weekday := 5;
      WHEN 'Sunday' THEN target_weekday := 6;
      ELSE target_weekday := 0;
    END CASE;
    
    -- Calculate first session date
    start_weekday := (EXTRACT(DOW FROM p_start_date) + 6) % 7;
    days_diff := (target_weekday - start_weekday + 7) % 7;
    
    -- If same day, move to next week
    IF days_diff = 0 THEN
      days_diff := 7;
    END IF;
    
    first_session_date := p_start_date + days_diff;
    
    -- **ATOMIC SESSION CREATION WITH DUPLICATE PREVENTION** 
    FOR i IN 0..(p_session_count - 1)
    LOOP
      session_datetime := (first_session_date + (i * 7))::DATE + session_time::TIME;
      
      -- Check if session already exists at this exact datetime
      SELECT COUNT(*) INTO existing_count
      FROM public.lesson_sessions 
      WHERE student_id = p_student_id 
        AND scheduled_date = session_datetime;
      
      -- Only create if it doesn't exist
      IF existing_count = 0 THEN
        INSERT INTO public.lesson_sessions (
          subscription_id,
          student_id,
          scheduled_date,
          duration_minutes,
          status,
          payment_status,
          cost,
          notes
        ) VALUES (
          new_subscription_id,
          p_student_id,
          session_datetime,
          60,
          'scheduled',
          'paid',
          session_cost,
          'Auto-generated from subscription (session:' || (i + 1) || '/' || p_session_count || ')'
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Return the created subscription
  RETURN QUERY
  SELECT 
    sub.id,
    sub.student_id,
    sub.session_count,
    sub.duration_months,
    sub.start_date,
    sub.schedule,
    sub.price_mode,
    sub.price_per_session,
    sub.fixed_price,
    sub.total_price,
    sub.currency,
    sub.notes,
    sub.status,
    sub.created_at
  FROM public.subscriptions sub
  WHERE sub.id = new_subscription_id;
END;
$function$;
