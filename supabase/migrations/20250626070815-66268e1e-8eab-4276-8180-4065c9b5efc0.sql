
-- Fix the delete_student_subscription function to properly handle authentication
CREATE OR REPLACE FUNCTION public.delete_student_subscription(p_subscription_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  subscription_record public.subscriptions;
  student_record public.students;
  sessions_deleted_count INTEGER := 0;
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- If no authenticated user, return error
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;
  
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
  
  -- Get the student record to verify school ownership
  SELECT st.* INTO student_record
  FROM public.students st
  WHERE st.id = subscription_record.student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student not found'
    );
  END IF;
  
  -- Verify the current user belongs to the same school as the student
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = current_user_id 
    AND u.school_id = student_record.school_id
    AND u.role IN ('admin', 'teacher')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied: You do not have permission to delete this subscription'
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
