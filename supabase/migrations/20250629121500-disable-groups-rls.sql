
-- Disable RLS on groups table since we're using custom local auth instead of Supabase auth
-- Since we're using custom local auth instead of Supabase auth, auth.uid() will always be NULL
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on group_students table for consistency
ALTER TABLE public.group_students DISABLE ROW LEVEL SECURITY;
