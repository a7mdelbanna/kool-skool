
-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('client', 'vendor', 'service_provider', 'freelancer', 'other')),
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add contact_id to student_payments table (for income from non-student contacts)
ALTER TABLE public.student_payments 
ADD COLUMN contact_id UUID REFERENCES public.contacts(id);

-- Create expenses table for tracking non-student expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transfers table for tracking money transfers
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  transfer_date DATE NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_tags junction table for tagging contacts
CREATE TABLE public.contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Create RLS policies for contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts from their school" 
  ON public.contacts 
  FOR SELECT 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create contacts for their school" 
  ON public.contacts 
  FOR INSERT 
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update contacts from their school" 
  ON public.contacts 
  FOR UPDATE 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete contacts from their school" 
  ON public.contacts 
  FOR DELETE 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

-- Create RLS policies for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses from their school" 
  ON public.expenses 
  FOR SELECT 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create expenses for their school" 
  ON public.expenses 
  FOR INSERT 
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update expenses from their school" 
  ON public.expenses 
  FOR UPDATE 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete expenses from their school" 
  ON public.expenses 
  FOR DELETE 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

-- Create RLS policies for transfers
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfers from their school" 
  ON public.transfers 
  FOR SELECT 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create transfers for their school" 
  ON public.transfers 
  FOR INSERT 
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update transfers from their school" 
  ON public.transfers 
  FOR UPDATE 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete transfers from their school" 
  ON public.transfers 
  FOR DELETE 
  USING (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()));

-- Create RLS policies for contact_tags
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact tags from their school" 
  ON public.contact_tags 
  FOR SELECT 
  USING (contact_id IN (SELECT id FROM public.contacts WHERE school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Users can create contact tags for their school" 
  ON public.contact_tags 
  FOR INSERT 
  WITH CHECK (contact_id IN (SELECT id FROM public.contacts WHERE school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Users can delete contact tags from their school" 
  ON public.contact_tags 
  FOR DELETE 
  USING (contact_id IN (SELECT id FROM public.contacts WHERE school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid())));

-- Create database functions for contacts management
CREATE OR REPLACE FUNCTION public.get_school_contacts(p_school_id uuid)
 RETURNS TABLE(
   id uuid, 
   name text, 
   type text, 
   email text, 
   phone text, 
   notes text, 
   created_at timestamp with time zone,
   tag_count bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.type,
    c.email,
    c.phone,
    c.notes,
    c.created_at,
    COUNT(ct.id) as tag_count
  FROM public.contacts c
  LEFT JOIN public.contact_tags ct ON c.id = ct.contact_id
  WHERE c.school_id = p_school_id
  GROUP BY c.id, c.name, c.type, c.email, c.phone, c.notes, c.created_at
  ORDER BY c.name;
END;
$function$;

-- Create function to get contact with tags
CREATE OR REPLACE FUNCTION public.get_contact_with_tags(p_contact_id uuid)
 RETURNS TABLE(
   id uuid,
   name text,
   type text,
   email text,
   phone text,
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
    c.id,
    c.name,
    c.type,
    c.email,
    c.phone,
    c.notes,
    c.created_at,
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
  FROM public.contacts c
  LEFT JOIN public.contact_tags ct ON c.id = ct.contact_id
  LEFT JOIN public.transaction_tags tt ON ct.tag_id = tt.id
  WHERE c.id = p_contact_id
  GROUP BY c.id, c.name, c.type, c.email, c.phone, c.notes, c.created_at;
END;
$function$;

-- Create function to get all transactions (payments, expenses, transfers) with contact info
CREATE OR REPLACE FUNCTION public.get_transactions_with_contacts(p_school_id uuid)
 RETURNS TABLE(
   id uuid,
   type text,
   amount numeric,
   currency text,
   transaction_date date,
   description text,
   contact_name text,
   contact_type text,
   status text,
   created_at timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  -- Student payments (income from students)
  SELECT 
    sp.id,
    'income'::text as type,
    sp.amount,
    sp.currency,
    sp.payment_date as transaction_date,
    'Student payment'::text as description,
    (u.first_name || ' ' || u.last_name) as contact_name,
    'student'::text as contact_type,
    sp.status,
    sp.created_at
  FROM public.student_payments sp
  JOIN public.students s ON sp.student_id = s.id
  JOIN public.users u ON s.user_id = u.id
  WHERE s.school_id = p_school_id
  
  UNION ALL
  
  -- Contact-based payments (income from contacts)
  SELECT 
    sp.id,
    'income'::text as type,
    sp.amount,
    sp.currency,
    sp.payment_date as transaction_date,
    'Contact payment'::text as description,
    c.name as contact_name,
    c.type as contact_type,
    sp.status,
    sp.created_at
  FROM public.student_payments sp
  JOIN public.contacts c ON sp.contact_id = c.id
  WHERE c.school_id = p_school_id
  
  UNION ALL
  
  -- Expenses
  SELECT 
    e.id,
    'expense'::text as type,
    e.amount,
    e.currency,
    e.expense_date as transaction_date,
    e.description,
    COALESCE(c.name, 'Unknown Contact') as contact_name,
    COALESCE(c.type, 'unknown') as contact_type,
    e.status,
    e.created_at
  FROM public.expenses e
  LEFT JOIN public.contacts c ON e.contact_id = c.id
  WHERE e.school_id = p_school_id
  
  UNION ALL
  
  -- Transfers
  SELECT 
    t.id,
    'transfer'::text as type,
    t.amount,
    t.currency,
    t.transfer_date as transaction_date,
    t.description,
    COALESCE(c.name, 'Internal Transfer') as contact_name,
    COALESCE(c.type, 'internal') as contact_type,
    t.status,
    t.created_at
  FROM public.transfers t
  LEFT JOIN public.contacts c ON t.contact_id = c.id
  WHERE t.school_id = p_school_id
  
  ORDER BY transaction_date DESC, created_at DESC;
END;
$function$;
