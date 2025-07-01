
-- =====================================================
-- ACCOUNTS TABLE
-- =====================================================
-- Purpose: Financial accounts for tracking money (bank accounts, cash, etc.)
-- Used in the financial management system for income/expense tracking
-- =====================================================

CREATE TABLE public.accounts (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    currency_id UUID NOT NULL REFERENCES public.currencies(id),
    
    -- Account information
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('General', 'Cash', 'Current Account', 'Savings', 'Bonus', 'Insurance', 'Investment', 'Loan', 'Mortgage')),
    account_number TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    
    -- Account settings
    exclude_from_stats BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.accounts IS 'Financial accounts for tracking money flow (bank accounts, cash, etc.)';
COMMENT ON COLUMN public.accounts.id IS 'Unique identifier for each account';
COMMENT ON COLUMN public.accounts.school_id IS 'Reference to the school owning this account';
COMMENT ON COLUMN public.accounts.currency_id IS 'Reference to the account currency';
COMMENT ON COLUMN public.accounts.name IS 'Account name (e.g., Main Bank Account, Petty Cash)';
COMMENT ON COLUMN public.accounts.type IS 'Account type: General, Cash, Current Account, Savings, etc.';
COMMENT ON COLUMN public.accounts.account_number IS 'Optional account number or identifier';
COMMENT ON COLUMN public.accounts.color IS 'Color code for visual identification in UI';
COMMENT ON COLUMN public.accounts.exclude_from_stats IS 'Whether to exclude this account from financial statistics';
COMMENT ON COLUMN public.accounts.is_archived IS 'Whether this account is archived (hidden but not deleted)';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_accounts_school_id ON public.accounts(school_id);
CREATE INDEX idx_accounts_currency_id ON public.accounts(currency_id);
CREATE INDEX idx_accounts_type ON public.accounts(type);
CREATE INDEX idx_accounts_is_archived ON public.accounts(is_archived);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Users can view accounts from their school
CREATE POLICY "School users can view accounts" 
ON public.accounts FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only admins can manage accounts
CREATE POLICY "Admins can manage accounts" 
ON public.accounts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = accounts.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION update_accounts_updated_at();
