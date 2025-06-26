
-- Fix the get_current_user_info function to return the actual user_id instead of school_id
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(user_id uuid, user_school_id uuid, user_role text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT id, school_id, role
  FROM public.users
  WHERE id = auth.uid();
END;
$function$;
