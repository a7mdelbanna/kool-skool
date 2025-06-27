
-- Create a unified transactions table to handle all transaction types
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  
  -- Contact information (for all transaction types)
  contact_id UUID REFERENCES public.contacts(id),
  
  -- Category information
  category_id UUID REFERENCES public.transaction_categories(id),
  
  -- Account information
  from_account_id UUID REFERENCES public.accounts(id),
  to_account_id UUID REFERENCES public.accounts(id),
  
  -- Payment method (for income and expense)
  payment_method TEXT,
  
  -- Receipt information
  receipt_number TEXT,
  receipt_url TEXT,
  
  -- Tax information
  tax_amount NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  
  -- Recurring transaction info
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_end_date DATE,
  parent_transaction_id UUID REFERENCES public.transactions(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_transactions_school_id ON public.transactions(school_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_contact_id ON public.transactions(contact_id);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_transactions_from_account ON public.transactions(from_account_id);
CREATE INDEX idx_transactions_to_account ON public.transactions(to_account_id);

-- Create junction table for transaction tags
CREATE TABLE public.transaction_tags_junction (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, tag_id)
);

-- Create index for transaction tags junction
CREATE INDEX idx_transaction_tags_junction_transaction ON public.transaction_tags_junction(transaction_id);
CREATE INDEX idx_transaction_tags_junction_tag ON public.transaction_tags_junction(tag_id);

-- Function to get transactions with full details
CREATE OR REPLACE FUNCTION public.get_school_transactions(p_school_id UUID)
RETURNS TABLE(
  id UUID,
  type TEXT,
  amount NUMERIC,
  currency TEXT,
  transaction_date DATE,
  description TEXT,
  notes TEXT,
  status TEXT,
  contact_name TEXT,
  contact_type TEXT,
  category_name TEXT,
  category_full_path TEXT,
  from_account_name TEXT,
  to_account_name TEXT,
  payment_method TEXT,
  receipt_number TEXT,
  receipt_url TEXT,
  tax_amount NUMERIC,
  tax_rate NUMERIC,
  is_recurring BOOLEAN,
  recurring_frequency TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  tags JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.type,
    t.amount,
    t.currency,
    t.transaction_date,
    t.description,
    t.notes,
    t.status,
    c.name as contact_name,
    c.type as contact_type,
    tc.name as category_name,
    public.get_category_path(tc.id) as category_full_path,
    fa.name as from_account_name,
    ta.name as to_account_name,
    t.payment_method,
    t.receipt_number,
    t.receipt_url,
    t.tax_amount,
    t.tax_rate,
    t.is_recurring,
    t.recurring_frequency,
    t.created_at,
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
  FROM public.transactions t
  LEFT JOIN public.contacts c ON t.contact_id = c.id
  LEFT JOIN public.transaction_categories tc ON t.category_id = tc.id
  LEFT JOIN public.accounts fa ON t.from_account_id = fa.id
  LEFT JOIN public.accounts ta ON t.to_account_id = ta.id
  LEFT JOIN public.transaction_tags_junction ttj ON t.id = ttj.transaction_id
  LEFT JOIN public.transaction_tags tt ON ttj.tag_id = tt.id
  WHERE t.school_id = p_school_id
  GROUP BY t.id, t.type, t.amount, t.currency, t.transaction_date, t.description, 
           t.notes, t.status, c.name, c.type, tc.name, tc.id, fa.name, ta.name,
           t.payment_method, t.receipt_number, t.receipt_url, t.tax_amount, 
           t.tax_rate, t.is_recurring, t.recurring_frequency, t.created_at
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$;

-- Function to create a new transaction
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_school_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_transaction_date DATE,
  p_description TEXT,
  p_notes TEXT DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_from_account_id UUID DEFAULT NULL,
  p_to_account_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_receipt_number TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_tax_amount NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 0,
  p_is_recurring BOOLEAN DEFAULT FALSE,
  p_recurring_frequency TEXT DEFAULT NULL,
  p_recurring_end_date DATE DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_transaction_id UUID;
  tag_id UUID;
BEGIN
  -- Insert the new transaction
  INSERT INTO public.transactions (
    school_id, type, amount, currency, transaction_date, description, notes,
    contact_id, category_id, from_account_id, to_account_id, payment_method,
    receipt_number, receipt_url, tax_amount, tax_rate, is_recurring,
    recurring_frequency, recurring_end_date
  ) VALUES (
    p_school_id, p_type, p_amount, p_currency, p_transaction_date, p_description, p_notes,
    p_contact_id, p_category_id, p_from_account_id, p_to_account_id, p_payment_method,
    p_receipt_number, p_receipt_url, p_tax_amount, p_tax_rate, p_is_recurring,
    p_recurring_frequency, p_recurring_end_date
  ) RETURNING id INTO new_transaction_id;
  
  -- Add tags if provided
  IF p_tag_ids IS NOT NULL THEN
    FOREACH tag_id IN ARRAY p_tag_ids
    LOOP
      INSERT INTO public.transaction_tags_junction (transaction_id, tag_id)
      VALUES (new_transaction_id, tag_id)
      ON CONFLICT (transaction_id, tag_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN new_transaction_id;
END;
$$;

-- Add updated_at trigger for transactions table
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON public.transactions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
