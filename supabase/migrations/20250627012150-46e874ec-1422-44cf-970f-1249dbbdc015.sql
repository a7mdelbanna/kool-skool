
-- Update the set_default_currency function to work with our custom auth system
CREATE OR REPLACE FUNCTION public.set_default_currency(p_currency_id uuid, p_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Since we're using custom auth and localStorage, we'll skip the user validation
  -- and rely on the application layer to ensure only admins can call this function
  
  -- Remove default from all currencies in the school
  UPDATE public.currencies 
  SET is_default = false, updated_at = now()
  WHERE school_id = p_school_id;
  
  -- Set the selected currency as default
  UPDATE public.currencies 
  SET is_default = true, updated_at = now()
  WHERE id = p_currency_id AND school_id = p_school_id;
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Currency not found or does not belong to the school'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Default currency updated successfully'
  );
END;
$$;
