
-- Create a table for student payments
CREATE TABLE public.student_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for student payments
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

-- Policy to allow school members to view payments for students in their school
CREATE POLICY "School members can view student payments" ON public.student_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = student_payments.student_id 
    AND s.school_id = u.school_id
  )
);

-- Policy to allow school admins and teachers to insert payments
CREATE POLICY "School admins and teachers can insert student payments" ON public.student_payments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = student_payments.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy to allow school admins and teachers to update payments
CREATE POLICY "School admins and teachers can update student payments" ON public.student_payments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = student_payments.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy to allow school admins and teachers to delete payments
CREATE POLICY "School admins and teachers can delete student payments" ON public.student_payments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = student_payments.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Create a database function to get student payments
CREATE OR REPLACE FUNCTION public.get_student_payments(p_student_id UUID)
RETURNS TABLE(
  id UUID,
  student_id UUID,
  amount DECIMAL(10,2),
  currency TEXT,
  payment_date DATE,
  payment_method TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.student_id,
    sp.amount,
    sp.currency,
    sp.payment_date,
    sp.payment_method,
    sp.status,
    sp.notes,
    sp.created_at
  FROM public.student_payments sp
  WHERE sp.student_id = p_student_id
  ORDER BY sp.payment_date DESC, sp.created_at DESC;
END;
$function$;
