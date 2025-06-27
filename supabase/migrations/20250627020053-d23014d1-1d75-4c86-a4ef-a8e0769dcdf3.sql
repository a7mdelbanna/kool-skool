
-- Disable RLS on contacts table since we're using custom authentication
-- and application-level security with school_id filtering
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;

-- Drop the existing RLS policies since they won't work with custom auth
DROP POLICY IF EXISTS "Allow school staff to view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow school staff to insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow school staff to update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow school staff to delete contacts" ON public.contacts;
