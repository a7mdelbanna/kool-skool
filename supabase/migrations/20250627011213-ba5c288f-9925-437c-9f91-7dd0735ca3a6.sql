
-- Create currencies table
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  code TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, code)
);

-- Add RLS policies for currencies
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Users can view currencies from their school
CREATE POLICY "Users can view school currencies" 
  ON public.currencies 
  FOR SELECT 
  USING (school_id IN (
    SELECT school_id FROM public.users WHERE id = auth.uid()
  ));

-- Only admins can insert currencies
CREATE POLICY "Admins can create currencies" 
  ON public.currencies 
  FOR INSERT 
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update currencies
CREATE POLICY "Admins can update currencies" 
  ON public.currencies 
  FOR UPDATE 
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete currencies
CREATE POLICY "Admins can delete currencies" 
  ON public.currencies 
  FOR DELETE 
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to get school currencies
CREATE OR REPLACE FUNCTION public.get_school_currencies(p_school_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  symbol text,
  code text,
  exchange_rate numeric,
  is_default boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.symbol,
    c.code,
    c.exchange_rate,
    c.is_default,
    c.created_at
  FROM public.currencies c
  WHERE c.school_id = p_school_id
  ORDER BY c.is_default DESC, c.name ASC;
END;
$$;

-- Create function to set default currency
CREATE OR REPLACE FUNCTION public.set_default_currency(p_currency_id uuid, p_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_record public.users;
BEGIN
  -- Get current user info and validate permissions
  SELECT * INTO current_user_record FROM public.users WHERE id = auth.uid();
  
  IF current_user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  IF current_user_record.school_id != p_school_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User school mismatch'
    );
  END IF;
  
  IF current_user_record.role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can set default currency'
    );
  END IF;
  
  -- Remove default from all currencies in the school
  UPDATE public.currencies 
  SET is_default = false, updated_at = now()
  WHERE school_id = p_school_id;
  
  -- Set the selected currency as default
  UPDATE public.currencies 
  SET is_default = true, updated_at = now()
  WHERE id = p_currency_id AND school_id = p_school_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Default currency updated successfully'
  );
END;
$$;

-- Insert default USD currency for existing schools
INSERT INTO public.currencies (school_id, name, symbol, code, exchange_rate, is_default)
SELECT s.id, 'US Dollar', '$', 'USD', 1.0, true
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.currencies c
  WHERE c.school_id = s.id
);
