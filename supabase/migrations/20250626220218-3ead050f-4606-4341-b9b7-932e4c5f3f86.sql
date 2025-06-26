
-- Create tags table
CREATE TABLE public.transaction_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  school_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, school_id)
);

-- Create junction table for payment-tag relationships
CREATE TABLE public.payment_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.student_payments(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payment_id, tag_id)
);

-- Add RLS policies for transaction_tags
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags from their school" 
  ON public.transaction_tags 
  FOR SELECT 
  USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and teachers can manage tags" 
  ON public.transaction_tags 
  FOR ALL 
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher')
    )
  );

-- Add RLS policies for payment_tags
ALTER TABLE public.payment_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment tags from their school" 
  ON public.payment_tags 
  FOR SELECT 
  USING (
    payment_id IN (
      SELECT sp.id FROM public.student_payments sp
      JOIN public.students s ON sp.student_id = s.id
      JOIN public.users u ON s.school_id = u.school_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Admins and teachers can manage payment tags" 
  ON public.payment_tags 
  FOR ALL 
  USING (
    payment_id IN (
      SELECT sp.id FROM public.student_payments sp
      JOIN public.students s ON sp.student_id = s.id
      JOIN public.users u ON s.school_id = u.school_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'teacher')
    )
  );

-- Create function to get payment tags
CREATE OR REPLACE FUNCTION public.get_payment_with_tags(p_payment_id uuid)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  amount numeric,
  currency text,
  payment_date date,
  payment_method text,
  status text,
  notes text,
  created_at timestamp with time zone,
  tags jsonb
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
    sp.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', tt.id,
          'name', tt.name,
          'color', tt.color
        )
      ) FILTER (WHERE tt.id IS NOT NULL),
      '[]'::jsonb
    ) as tags
  FROM public.student_payments sp
  LEFT JOIN public.payment_tags pt ON sp.id = pt.payment_id
  LEFT JOIN public.transaction_tags tt ON pt.tag_id = tt.id
  WHERE sp.id = p_payment_id
  GROUP BY sp.id, sp.student_id, sp.amount, sp.currency, sp.payment_date, 
           sp.payment_method, sp.status, sp.notes, sp.created_at;
END;
$function$;

-- Create function to get all tags for a school
CREATE OR REPLACE FUNCTION public.get_school_tags(p_school_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  color text,
  created_at timestamp with time zone,
  usage_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tt.id,
    tt.name,
    tt.color,
    tt.created_at,
    COUNT(pt.id) as usage_count
  FROM public.transaction_tags tt
  LEFT JOIN public.payment_tags pt ON tt.id = pt.tag_id
  WHERE tt.school_id = p_school_id
  GROUP BY tt.id, tt.name, tt.color, tt.created_at
  ORDER BY tt.name;
END;
$function$;

-- Create function to add tag to payment
CREATE OR REPLACE FUNCTION public.add_payment_tag(p_payment_id uuid, p_tag_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.payment_tags (payment_id, tag_id)
  VALUES (p_payment_id, p_tag_id)
  ON CONFLICT (payment_id, tag_id) DO NOTHING;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Tag added to payment'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to add tag to payment'
    );
END;
$function$;

-- Create function to remove tag from payment
CREATE OR REPLACE FUNCTION public.remove_payment_tag(p_payment_id uuid, p_tag_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.payment_tags 
  WHERE payment_id = p_payment_id AND tag_id = p_tag_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Tag removed from payment'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to remove tag from payment'
    );
END;
$function$;
