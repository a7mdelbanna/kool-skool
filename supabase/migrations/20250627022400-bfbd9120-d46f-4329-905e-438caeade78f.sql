
-- Create the transaction_categories table
CREATE TABLE public.transaction_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  parent_id UUID REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, name, parent_id)
);

-- Add indexes for better performance
CREATE INDEX idx_transaction_categories_school_id ON public.transaction_categories(school_id);
CREATE INDEX idx_transaction_categories_parent_id ON public.transaction_categories(parent_id);
CREATE INDEX idx_transaction_categories_type ON public.transaction_categories(type);

-- Create a function to get the full category path
CREATE OR REPLACE FUNCTION public.get_category_path(category_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  path TEXT := '';
  current_id UUID := category_id;
  current_name TEXT;
  parent_id UUID;
BEGIN
  -- Build the path from child to parent
  WHILE current_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_name, parent_id
    FROM public.transaction_categories
    WHERE id = current_id;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := parent_id;
  END LOOP;
  
  RETURN path;
END;
$$;

-- Create function to get school categories with full path
CREATE OR REPLACE FUNCTION public.get_school_categories(p_school_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type TEXT,
  color TEXT,
  parent_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  full_path TEXT,
  level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Base case: root categories (no parent)
    SELECT 
      tc.id,
      tc.name,
      tc.type,
      tc.color,
      tc.parent_id,
      tc.is_active,
      tc.created_at,
      tc.name as full_path,
      0 as level
    FROM public.transaction_categories tc
    WHERE tc.school_id = p_school_id 
      AND tc.parent_id IS NULL
      AND tc.is_active = true
    
    UNION ALL
    
    -- Recursive case: child categories
    SELECT 
      tc.id,
      tc.name,
      tc.type,
      tc.color,
      tc.parent_id,
      tc.is_active,
      tc.created_at,
      ct.full_path || ' > ' || tc.name as full_path,
      ct.level + 1 as level
    FROM public.transaction_categories tc
    INNER JOIN category_tree ct ON tc.parent_id = ct.id
    WHERE tc.school_id = p_school_id 
      AND tc.is_active = true
  )
  SELECT * FROM category_tree
  ORDER BY full_path;
END;
$$;

-- Add category_id column to existing transaction tables
ALTER TABLE public.student_payments ADD COLUMN category_id UUID REFERENCES public.transaction_categories(id);
ALTER TABLE public.expenses ADD COLUMN category_id UUID REFERENCES public.transaction_categories(id);
ALTER TABLE public.transfers ADD COLUMN category_id UUID REFERENCES public.transaction_categories(id);

-- Create indexes for the new foreign keys
CREATE INDEX idx_student_payments_category_id ON public.student_payments(category_id);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_transfers_category_id ON public.transfers(category_id);

-- Create function to create default categories for a school
CREATE OR REPLACE FUNCTION public.create_default_categories(p_school_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  income_cat_id UUID;
  expense_cat_id UUID;
  transfer_cat_id UUID;
BEGIN
  -- Create main Income category
  INSERT INTO public.transaction_categories (school_id, name, type, color)
  VALUES (p_school_id, 'Tuition & Fees', 'income', '#10B981')
  RETURNING id INTO income_cat_id;
  
  -- Create main Expense categories
  INSERT INTO public.transaction_categories (school_id, name, type, color)
  VALUES (p_school_id, 'Payroll', 'expense', '#EF4444')
  RETURNING id INTO expense_cat_id;
  
  -- Create subcategories for Payroll
  INSERT INTO public.transaction_categories (school_id, name, type, color, parent_id)
  VALUES 
    (p_school_id, 'Teachers', 'expense', '#EF4444', expense_cat_id),
    (p_school_id, 'Staff', 'expense', '#EF4444', expense_cat_id);
  
  -- Create Utilities category
  INSERT INTO public.transaction_categories (school_id, name, type, color)
  VALUES (p_school_id, 'Utilities', 'expense', '#F59E0B')
  RETURNING id INTO expense_cat_id;
  
  -- Create subcategories for Utilities
  INSERT INTO public.transaction_categories (school_id, name, type, color, parent_id)
  VALUES 
    (p_school_id, 'Electricity', 'expense', '#F59E0B', expense_cat_id),
    (p_school_id, 'Internet', 'expense', '#F59E0B', expense_cat_id);
  
  -- Create Marketing category
  INSERT INTO public.transaction_categories (school_id, name, type, color)
  VALUES (p_school_id, 'Marketing', 'expense', '#8B5CF6');
  
  -- Create Transfer category
  INSERT INTO public.transaction_categories (school_id, name, type, color)
  VALUES (p_school_id, 'Account Transfers', 'transfer', '#6366F1');
END;
$$;
