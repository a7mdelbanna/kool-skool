
-- Create a function to delete student payments with proper authorization
CREATE OR REPLACE FUNCTION public.delete_student_payment(
  p_payment_id uuid,
  p_current_user_id uuid,
  p_current_school_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_record public.users;
  payment_record public.student_payments;
  student_record public.students;
BEGIN
  -- Get current user info and validate permissions
  SELECT * INTO current_user_record FROM public.users WHERE users.id = p_current_user_id;
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  IF current_user_record.school_id != p_current_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User school mismatch'
    );
  END IF;
  
  IF current_user_record.role NOT IN ('admin', 'teacher') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins and teachers can delete payments'
    );
  END IF;
  
  -- Get the payment record and verify it exists
  SELECT * INTO payment_record FROM public.student_payments WHERE id = p_payment_id;
  
  IF payment_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment not found'
    );
  END IF;
  
  -- Verify the student belongs to the same school
  SELECT * INTO student_record FROM public.students WHERE id = payment_record.student_id;
  
  IF student_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student not found'
    );
  END IF;
  
  IF student_record.school_id != p_current_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment does not belong to your school'
    );
  END IF;
  
  -- Delete the payment
  DELETE FROM public.student_payments WHERE id = p_payment_id;
  
  -- Verify deletion was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to delete payment'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Payment deleted successfully'
  );
END;
$function$;
