
-- First, let's see the current state of the add_student_subscription function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'add_student_subscription';

-- Check for any duplicate sessions in the database
SELECT 
  student_id,
  scheduled_date,
  notes,
  COUNT(*) as duplicate_count
FROM public.lesson_sessions 
WHERE student_id = '75901863-00a6-4dc8-9148-8893a7b4abae'
GROUP BY student_id, scheduled_date, notes
HAVING COUNT(*) > 1
ORDER BY scheduled_date;

-- Check all sessions for this student to understand the pattern
SELECT 
  id,
  subscription_id,
  scheduled_date,
  notes,
  created_at,
  index_in_sub
FROM public.lesson_sessions 
WHERE student_id = '75901863-00a6-4dc8-9148-8893a7b4abae'
ORDER BY scheduled_date, created_at;

-- Check if there are multiple versions of the function
SELECT 
  p.proname,
  p.proargtypes::regtype[],
  COUNT(*) as function_count
FROM pg_proc p
WHERE p.proname = 'add_student_subscription'
GROUP BY p.proname, p.proargtypes
HAVING COUNT(*) > 1;

-- Check the subscriptions for this student
SELECT 
  id,
  session_count,
  start_date,
  schedule,
  created_at
FROM public.subscriptions 
WHERE student_id = '75901863-00a6-4dc8-9148-8893a7b4abae'
ORDER BY created_at DESC;
