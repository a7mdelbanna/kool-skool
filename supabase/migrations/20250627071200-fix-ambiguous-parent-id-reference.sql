
-- Fix the ambiguous parent_id column reference in get_category_path function
CREATE OR REPLACE FUNCTION public.get_category_path(category_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  path TEXT := '';
  current_id UUID := category_id;
  current_name TEXT;
  current_parent_id UUID;
BEGIN
  -- Build the path from child to parent
  WHILE current_id IS NOT NULL LOOP
    SELECT tc.name, tc.parent_id INTO current_name, current_parent_id
    FROM public.transaction_categories tc
    WHERE tc.id = current_id;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := current_parent_id;
  END LOOP;
  
  RETURN path;
END;
$function$
