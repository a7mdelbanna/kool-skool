
-- Fix the delete_student_subscription function to work with custom authentication
-- instead of relying on auth.uid() which returns null in our system
CREATE OR REPLACE FUNCTION public.delete_student_subscription(p_subscription_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  subscription_record public.subscriptions;
  student_record public.students;
  sessions_deleted_count INTEGER := 0;
BEGIN
  -- First get the subscription and verify it exists
  SELECT s.* INTO subscription_record 
  FROM public.subscriptions s
  WHERE s.id = p_subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Get the student record to verify it exists
  SELECT st.* INTO student_record
  FROM public.students st
  WHERE st.id = subscription_record.student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student not found'
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
