
-- Enable RLS on contacts table (if not already enabled)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow school staff to view contacts from their school
CREATE POLICY "Allow school staff to view contacts" ON public.contacts
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = (
      SELECT id FROM public.users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
    AND users.school_id = contacts.school_id
  )
);

-- Create policy to allow school staff to insert contacts for their school
CREATE POLICY "Allow school staff to insert contacts" ON public.contacts
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = (
      SELECT id FROM public.users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
    AND users.school_id = contacts.school_id
  )
);

-- Create policy to allow school staff to update contacts from their school
CREATE POLICY "Allow school staff to update contacts" ON public.contacts
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = (
      SELECT id FROM public.users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
    AND users.school_id = contacts.school_id
  )
);

-- Create policy to allow school staff to delete contacts from their school
CREATE POLICY "Allow school staff to delete contacts" ON public.contacts
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = (
      SELECT id FROM public.users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
    AND users.school_id = contacts.school_id
  )
);
