
-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  name TEXT NOT NULL,
  currency_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('General', 'Cash', 'Current Account', 'Savings', 'Bonus', 'Insurance', 'Investment', 'Loan', 'Mortgage')),
  account_number TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  exclude_from_stats BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to currencies table
ALTER TABLE public.accounts 
ADD CONSTRAINT accounts_currency_id_fkey 
FOREIGN KEY (currency_id) REFERENCES public.currencies(id);

-- Add foreign key constraint to schools table  
ALTER TABLE public.accounts 
ADD CONSTRAINT accounts_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- Add indexes for better performance
CREATE INDEX idx_accounts_school_id ON public.accounts(school_id);
CREATE INDEX idx_accounts_currency_id ON public.accounts(currency_id);

-- Create RPC function to get school accounts with currency info
CREATE OR REPLACE FUNCTION public.get_school_accounts(p_school_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  type text,
  account_number text,
  color text,
  exclude_from_stats boolean,
  is_archived boolean,
  created_at timestamp with time zone,
  currency_id uuid,
  currency_name text,
  currency_symbol text,
  currency_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.type,
    a.account_number,
    a.color,
    a.exclude_from_stats,
    a.is_archived,
    a.created_at,
    a.currency_id,
    c.name as currency_name,
    c.symbol as currency_symbol,
    c.code as currency_code
  FROM public.accounts a
  JOIN public.currencies c ON a.currency_id = c.id
  WHERE a.school_id = p_school_id
  ORDER BY a.is_archived ASC, a.name ASC;
END;
$$;

-- Add account_id column to existing transaction tables
ALTER TABLE public.student_payments 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.expenses 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.transfers 
ADD COLUMN from_account_id UUID REFERENCES public.accounts(id),
ADD COLUMN to_account_id UUID REFERENCES public.accounts(id);

-- Create indexes for the new foreign keys
CREATE INDEX idx_student_payments_account_id ON public.student_payments(account_id);
CREATE INDEX idx_expenses_account_id ON public.expenses(account_id);
CREATE INDEX idx_transfers_from_account_id ON public.transfers(from_account_id);
CREATE INDEX idx_transfers_to_account_id ON public.transfers(to_account_id);
