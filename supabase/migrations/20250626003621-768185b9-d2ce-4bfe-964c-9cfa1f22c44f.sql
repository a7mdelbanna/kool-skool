
-- Create a delete_course function to bypass RLS for deletions
CREATE OR REPLACE FUNCTION public.delete_course(
  p_course_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.courses 
  WHERE id = p_course_id;
END;
$function$;
