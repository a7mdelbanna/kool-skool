
-- Create a database function to properly delete subscriptions with all cascading operations
CREATE OR REPLACE FUNCTION public.delete_student_subscription(p_subscription_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  subscription_record public.subscriptions;
  sessions_deleted_count INTEGER := 0;
  current_user_record public.users;
BEGIN
  -- Get current user info for security validation
  SELECT * INTO current_user_record FROM public.users WHERE id = auth.uid();
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;
  
  -- Check if subscription exists and user has permission to delete it
  SELECT s.* INTO subscription_record 
  FROM public.subscriptions s
  JOIN public.students st ON s.student_id = st.id
  WHERE s.id = p_subscription_id 
    AND st.school_id = current_user_record.school_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found or access denied'
    );
  END IF;
  
  -- Delete associated lesson sessions first
  DELETE FROM public.lesson_sessions 
  WHERE subscription_id = p_subscription_id;
  
  GET DIAGNOSTICS sessions_deleted_count = ROW_COUNT;
  
  -- Delete the subscription
  DELETE FROM public.subscriptions 
  WHERE id = p_subscription_id;
  
  -- Verify subscription was deleted
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to delete subscription'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription deleted successfully',
    'sessions_deleted', sessions_deleted_count
  );
END;
$function$;
