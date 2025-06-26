
-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view other users in the same school (excluding students for team member view)
CREATE POLICY "Users can view team members in same school" 
  ON public.users 
  FOR SELECT 
  USING (
    school_id IN (
      SELECT school_id 
      FROM public.users 
      WHERE id = auth.uid()
    ) 
    AND role != 'student'
  );

-- Create policy to allow users to view their own record
CREATE POLICY "Users can view their own record" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Create a function to get team members (with SECURITY DEFINER to bypass RLS if needed)
CREATE OR REPLACE FUNCTION public.get_team_members(p_school_id uuid)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.created_at
  FROM public.users u
  WHERE u.school_id = p_school_id
    AND u.role != 'student'
  ORDER BY u.created_at DESC;
END;
$$;
