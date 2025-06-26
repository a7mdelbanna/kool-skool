
-- Create a function to update course that bypasses RLS
CREATE OR REPLACE FUNCTION public.update_course(
  p_course_id uuid,
  p_name text,
  p_lesson_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.courses 
  SET 
    name = p_name,
    lesson_type = p_lesson_type,
    updated_at = now()
  WHERE id = p_course_id;
END;
$function$;
