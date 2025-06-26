
-- Add RLS policies for student_payments table
-- Allow admins and teachers to view payments for students in their school
CREATE POLICY "Allow school staff to view student payments" 
ON public.student_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students s 
    JOIN public.users u ON u.school_id = s.school_id 
    WHERE s.id = student_payments.student_id 
    AND u.id = auth.uid()
    AND u.role IN ('admin', 'teacher')
  )
);

-- Allow admins and teachers to insert payments for students in their school
CREATE POLICY "Allow school staff to insert student payments" 
ON public.student_payments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s 
    JOIN public.users u ON u.school_id = s.school_id 
    WHERE s.id = student_payments.student_id 
    AND u.id = auth.uid()
    AND u.role IN ('admin', 'teacher')
  )
);

-- Allow admins and teachers to update payments for students in their school
CREATE POLICY "Allow school staff to update student payments" 
ON public.student_payments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.students s 
    JOIN public.users u ON u.school_id = s.school_id 
    WHERE s.id = student_payments.student_id 
    AND u.id = auth.uid()
    AND u.role IN ('admin', 'teacher')
  )
);

-- Allow admins and teachers to delete payments for students in their school
CREATE POLICY "Allow school staff to delete student payments" 
ON public.student_payments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.students s 
    JOIN public.users u ON u.school_id = s.school_id 
    WHERE s.id = student_payments.student_id 
    AND u.id = auth.uid()
    AND u.role IN ('admin', 'teacher')
  )
);
