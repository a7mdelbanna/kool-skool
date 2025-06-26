
-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Users can view tags from their school" ON public.transaction_tags;
DROP POLICY IF EXISTS "Admins and teachers can manage tags" ON public.transaction_tags;
DROP POLICY IF EXISTS "Users can view payment tags from their school" ON public.payment_tags;
DROP POLICY IF EXISTS "Admins and teachers can manage payment tags" ON public.payment_tags;

-- Create more permissive policies for now since we're using custom auth
-- In a production environment, you'd want to implement proper security

-- Allow all authenticated operations on transaction_tags
CREATE POLICY "Allow all operations on transaction_tags" 
  ON public.transaction_tags 
  FOR ALL 
  USING (true);

-- Allow all authenticated operations on payment_tags  
CREATE POLICY "Allow all operations on payment_tags" 
  ON public.payment_tags 
  FOR ALL 
  USING (true);
