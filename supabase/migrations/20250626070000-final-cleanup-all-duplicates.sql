
-- FINAL CLEANUP: Remove ALL duplicates and ensure single function version
-- This is the definitive fix for duplicate sessions

-- First, drop ALL existing versions of the function
DROP FUNCTION IF EXISTS public.add_student_subscription(uuid, integer, integer, date, jsonb, text, numeric, numeric, numeric, text, text, text, uuid, uuid);

-- Clean up ALL existing duplicate sessions completely
-- Keep only the most recent session for each unique date/time combination per student
WITH session_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, DATE(scheduled_date), EXTRACT(HOUR FROM scheduled_date), EXTRACT(MINUTE FROM scheduled_date)
      ORDER BY 
        -- Prefer sessions with proper notes structure
        CASE 
          WHEN notes LIKE '%FIXED-VERSION:%' OR notes LIKE '%FINAL-VERSION:%' THEN 1
          WHEN notes IS NOT NULL THEN 2
          ELSE 3 
        END,
        created_at DESC
    ) as row_num
  FROM public.lesson_sessions
)
DELETE FROM public.lesson_sessions 
WHERE id IN (
  SELECT id FROM session_duplicates WHERE row_num > 1
);

-- Create the ONE and ONLY version of add_student_subscription
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
  created_sessions_count INTEGER := 0;
  existing_session_count INTEGER;
BEGIN
  -- Validate current user
  SELECT u.* INTO current_user_record 
  FROM public.users u 
  WHERE u.id = p_current_user_id;
  
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
  SELECT s.* INTO student_record 
  FROM public.students s 
  WHERE s.id = p_student_id;
  
  IF student_record.id IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RAISE EXCEPTION 'Student does not belong to your school';
  END IF;
  
  -- CRITICAL: Clean deletion of existing future sessions
  DELETE FROM public.lesson_sessions ls
  WHERE ls.student_id = p_student_id 
  AND ls.scheduled_date >= p_start_date;
  
  -- Get affected rows to log
  GET DIAGNOSTICS existing_session_count = ROW_COUNT;
  RAISE NOTICE 'CLEANUP: Deleted % existing future sessions for student %', existing_session_count, p_student_id;
  
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
  
  -- Get the first schedule item
  schedule_item := (p_schedule -> 0);
  
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
    
    IF days_diff = 0 THEN
      days_diff := 7;
    END IF;
    
    first_session_date := p_start_date + days_diff;
    
    -- Create sessions with enhanced duplicate prevention
    FOR i IN 1..p_session_count
    LOOP
      session_datetime := (first_session_date + ((i - 1) * 7))::DATE + session_time::TIME;
      
      -- Double-check no duplicate exists before inserting
      IF NOT EXISTS (
        SELECT 1 FROM public.lesson_sessions 
        WHERE student_id = p_student_id 
        AND scheduled_date = session_datetime
      ) THEN
        
        INSERT INTO public.lesson_sessions (
          subscription_id,
          student_id,
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
          session_datetime,
          60,
          'scheduled',
          'paid',
          session_cost,
          'CLEAN-VERSION: Auto-generated from subscription (session:' || i || '/' || p_session_count || ')',
          i
        );
        
        created_sessions_count := created_sessions_count + 1;
        RAISE NOTICE 'CREATED: Session % at % for student %', i, session_datetime, p_student_id;
      ELSE
        RAISE NOTICE 'SKIPPED: Session % at % already exists for student %', i, session_datetime, p_student_id;
      END IF;
    END LOOP;
  END IF;
  
  -- Final verification
  RAISE NOTICE 'FINAL RESULT: Created exactly % sessions for subscription %', created_sessions_count, new_subscription_id;
  
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

-- Ensure the unique constraint is properly in place
DROP INDEX IF EXISTS idx_lesson_sessions_no_duplicates;
CREATE UNIQUE INDEX idx_lesson_sessions_no_duplicates
ON public.lesson_sessions (student_id, (scheduled_date::date), EXTRACT(HOUR FROM scheduled_date), EXTRACT(MINUTE FROM scheduled_date))
WHERE student_id IS NOT NULL;

-- Log final state
SELECT 
  student_id,
  scheduled_date,
  notes,
  COUNT(*) as session_count
FROM public.lesson_sessions 
GROUP BY student_id, scheduled_date, notes
HAVING COUNT(*) > 1;
