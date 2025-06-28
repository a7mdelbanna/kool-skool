
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_student_subscriptions(uuid);

-- Create the updated function with real-time session progress calculation
CREATE OR REPLACE FUNCTION public.get_student_subscriptions(p_student_id uuid)
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
  created_at timestamp with time zone, 
  end_date date,
  sessions_completed integer,
  sessions_attended integer,
  sessions_cancelled integer,
  sessions_scheduled integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.student_id,
    s.session_count,
    s.duration_months,
    s.start_date,
    s.schedule,
    s.price_mode,
    s.price_per_session,
    s.fixed_price,
    s.total_price,
    s.currency,
    s.notes,
    s.status,
    s.created_at,
    s.end_date,
    -- Real-time calculation of completed sessions (that count toward completion)
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.lesson_sessions ls 
       WHERE ls.subscription_id = s.id 
         AND ls.status IN ('completed', 'cancelled') 
         AND ls.counts_toward_completion = true), 
      0
    ) as sessions_completed,
    -- Additional breakdowns for better insights
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.lesson_sessions ls 
       WHERE ls.subscription_id = s.id 
         AND ls.status = 'completed' 
         AND ls.counts_toward_completion = true), 
      0
    ) as sessions_attended,
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.lesson_sessions ls 
       WHERE ls.subscription_id = s.id 
         AND ls.status = 'cancelled' 
         AND ls.counts_toward_completion = true), 
      0
    ) as sessions_cancelled,
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.lesson_sessions ls 
       WHERE ls.subscription_id = s.id 
         AND ls.status = 'scheduled'), 
      0
    ) as sessions_scheduled
  FROM public.subscriptions s
  WHERE s.student_id = p_student_id
  ORDER BY s.created_at DESC;
END;
$function$;
