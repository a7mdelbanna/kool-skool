
-- Create a function to get school courses that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_school_courses(p_school_id uuid)
RETURNS TABLE(
  id uuid,
  school_id uuid,
  name text,
  lesson_type text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.school_id,
    c.name,
    c.lesson_type,
    c.created_at,
    c.updated_at
  FROM public.courses c
  WHERE c.school_id = p_school_id
  ORDER BY c.name;
END;
$function$;
