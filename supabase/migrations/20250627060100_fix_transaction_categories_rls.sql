
-- Enable RLS on transaction_categories table
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view categories from their school" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and teachers can manage categories" ON public.transaction_categories;

-- Create permissive policies for transaction_categories since we're using custom auth
CREATE POLICY "Allow all operations on transaction_categories" 
  ON public.transaction_categories 
  FOR ALL 
  USING (true);

-- Also ensure the CategoryDialog can create categories by adding a simpler RPC function
CREATE OR REPLACE FUNCTION public.create_category(
  p_school_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_color TEXT,
  p_parent_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_category_id UUID;
BEGIN
  INSERT INTO public.transaction_categories (
    school_id,
    name,
    type,
    color,
    parent_id,
    is_active
  ) VALUES (
    p_school_id,
    p_name,
    p_type,
    p_color,
    p_parent_id,
    true
  ) RETURNING id INTO new_category_id;
  
  RETURN new_category_id;
END;
$$;

-- Create a function to update categories
CREATE OR REPLACE FUNCTION public.update_category(
  p_category_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_color TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.transaction_categories 
  SET 
    name = p_name,
    type = p_type,
    color = p_color,
    updated_at = now()
  WHERE id = p_category_id;
END;
$$;
