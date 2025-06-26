
-- Drop the existing RLS policies that use auth.uid()
DROP POLICY IF EXISTS "Allow school staff to view student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Allow school staff to insert student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Allow school staff to update student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Allow school staff to delete student payments" ON public.student_payments;

-- Disable RLS for student_payments since we're using custom auth
ALTER TABLE public.student_payments DISABLE ROW LEVEL SECURITY;
