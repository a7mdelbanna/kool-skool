
-- Fix ambiguous column reference in get_school_groups function
CREATE OR REPLACE FUNCTION public.get_school_groups(p_school_id uuid)
 RETURNS TABLE(id uuid, name text, description text, teacher_id uuid, teacher_name text, session_count integer, schedule jsonb, currency text, price_mode text, price_per_session numeric, total_price numeric, status text, student_count integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.description,
    g.teacher_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'No Teacher') as teacher_name,
    g.session_count,
    g.schedule,
    g.currency,
    g.price_mode,
    g.price_per_session,
    g.total_price,
    g.status, -- Explicitly reference the groups table status column
    COALESCE(gs_count.student_count, 0)::INTEGER as student_count,
    g.created_at
  FROM public.groups g
  LEFT JOIN public.users u ON g.teacher_id = u.id
  LEFT JOIN (
    SELECT 
      gs.group_id,
      COUNT(*) as student_count
    FROM public.group_students gs
    WHERE gs.status = 'active' -- Explicitly reference the group_students table status column
    GROUP BY gs.group_id
  ) gs_count ON g.id = gs_count.group_id
  WHERE g.school_id = p_school_id
  ORDER BY g.created_at DESC;
END;
$function$;
