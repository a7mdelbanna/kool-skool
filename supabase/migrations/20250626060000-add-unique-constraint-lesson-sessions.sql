
-- Add database-level unique constraint to prevent duplicates completely
-- This complements the function-level logic with a hard database guarantee

-- First, clean up any existing duplicates one final time
WITH duplicate_sessions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, subscription_id, DATE(scheduled_date)
      ORDER BY 
        CASE 
          WHEN notes LIKE '%FINAL-VERSION:%' THEN 1
          WHEN notes LIKE '%Auto-generated from subscription%' THEN 2
          ELSE 3 
        END,
        created_at ASC
    ) as rn
  FROM public.lesson_sessions
)
DELETE FROM public.lesson_sessions 
WHERE id IN (
  SELECT id FROM duplicate_sessions WHERE rn > 1
);

-- Drop any existing conflicting indexes
DROP INDEX IF EXISTS idx_lesson_sessions_unique_student_sub_date;
DROP INDEX IF EXISTS idx_lesson_sessions_unique_student_subscription_date;
DROP INDEX IF EXISTS idx_lesson_sessions_unique_student_datetime;

-- Create the definitive unique index to prevent duplicates at database level
-- This ensures NO duplicate sessions can ever be created, regardless of how they're inserted
CREATE UNIQUE INDEX idx_lesson_sessions_no_duplicates
ON public.lesson_sessions (student_id, subscription_id, (scheduled_date::date))
WHERE student_id IS NOT NULL AND subscription_id IS NOT NULL;

-- Add a comment to document the constraint
COMMENT ON INDEX idx_lesson_sessions_no_duplicates IS 
'Prevents duplicate lesson sessions for the same student, subscription, and date. 
This provides database-level guarantee against duplicates regardless of insertion method.';

-- Verify the constraint works by checking current data
SELECT 
  COUNT(*) as total_sessions,
  COUNT(DISTINCT (student_id, subscription_id, scheduled_date::date)) as unique_combinations
FROM public.lesson_sessions 
WHERE student_id IS NOT NULL AND subscription_id IS NOT NULL;
