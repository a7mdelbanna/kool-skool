
-- Create function to delete group with all related data
CREATE OR REPLACE FUNCTION public.delete_group_with_related_data(
  p_group_id uuid,
  p_current_user_id uuid,
  p_current_school_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  group_record public.groups;
  subscription_ids uuid[];
  deleted_subscriptions integer := 0;
  deleted_sessions integer := 0;
  deleted_payments integer := 0;
  deleted_group_students integer := 0;
BEGIN
  -- Validate user permissions
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'User school mismatch');
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RETURN json_build_object('success', false, 'message', 'Only admins and teachers can delete groups');
  END IF;
  
  -- Get and verify group exists and belongs to school
  SELECT * INTO group_record FROM public.groups WHERE groups.id = p_group_id;
  
  IF group_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Group not found');
  END IF;
  
  IF group_record.school_id != p_current_school_id THEN
    RETURN json_build_object('success', false, 'message', 'Group does not belong to your school');
  END IF;
  
  -- Get all subscription IDs for this group to track related payments
  SELECT ARRAY(
    SELECT s.id 
    FROM public.subscriptions s 
    WHERE s.group_id = p_group_id
  ) INTO subscription_ids;
  
  -- Delete related payments (transactions linked to group subscriptions)
  DELETE FROM public.transactions 
  WHERE subscription_id = ANY(subscription_ids);
  
  GET DIAGNOSTICS deleted_payments = ROW_COUNT;
  
  -- Delete lesson sessions for this group
  DELETE FROM public.lesson_sessions 
  WHERE group_id = p_group_id;
  
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Delete subscriptions for this group
  DELETE FROM public.subscriptions 
  WHERE group_id = p_group_id;
  
  GET DIAGNOSTICS deleted_subscriptions = ROW_COUNT;
  
  -- Delete group_students relationships
  DELETE FROM public.group_students 
  WHERE group_id = p_group_id;
  
  GET DIAGNOSTICS deleted_group_students = ROW_COUNT;
  
  -- Finally delete the group itself
  DELETE FROM public.groups 
  WHERE id = p_group_id;
  
  -- Verify deletion was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to delete group'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Group and all related data deleted successfully',
    'deleted_subscriptions', deleted_subscriptions,
    'deleted_sessions', deleted_sessions,
    'deleted_payments', deleted_payments,
    'deleted_group_students', deleted_group_students
  );
END;
$function$;
