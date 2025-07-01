
-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
-- Purpose: Unified table for all financial transactions (income, expense, transfer)
-- Central hub for financial tracking and reporting
-- =====================================================

CREATE TABLE public.transactions (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id),
    category_id UUID REFERENCES public.transaction_categories(id),
    from_account_id UUID REFERENCES public.accounts(id),
    to_account_id UUID REFERENCES public.accounts(id),
    subscription_id UUID REFERENCES public.subscriptions(id),
    parent_transaction_id UUID REFERENCES public.transactions(id),
    
    -- Transaction details
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
    
    -- Payment details
    payment_method TEXT,
    receipt_number TEXT,
    receipt_url TEXT,
    
    -- Tax information
    tax_amount NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    
    -- Recurring transaction info
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    recurring_end_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.transactions IS 'Unified financial transactions table for income, expenses, and transfers';
COMMENT ON COLUMN public.transactions.id IS 'Unique identifier for each transaction';
COMMENT ON COLUMN public.transactions.school_id IS 'Reference to the school owning this transaction';
COMMENT ON COLUMN public.transactions.contact_id IS 'Reference to associated contact (vendor, customer, etc.)';
COMMENT ON COLUMN public.transactions.category_id IS 'Reference to transaction category for organization';
COMMENT ON COLUMN public.transactions.from_account_id IS 'Source account (for expenses and transfers)';
COMMENT ON COLUMN public.transactions.to_account_id IS 'Destination account (for income and transfers)';
COMMENT ON COLUMN public.transactions.subscription_id IS 'Reference to related subscription (for student payments)';
COMMENT ON COLUMN public.transactions.parent_transaction_id IS 'Reference to parent transaction (for recurring transactions)';
COMMENT ON COLUMN public.transactions.type IS 'Transaction type: income, expense, or transfer';
COMMENT ON COLUMN public.transactions.amount IS 'Transaction amount (must be positive)';
COMMENT ON COLUMN public.transactions.currency IS 'Currency code for this transaction';
COMMENT ON COLUMN public.transactions.transaction_date IS 'Date when transaction occurred';
COMMENT ON COLUMN public.transactions.description IS 'Brief description of the transaction';
COMMENT ON COLUMN public.transactions.notes IS 'Additional notes or details';
COMMENT ON COLUMN public.transactions.status IS 'Transaction status: completed, pending, or cancelled';
COMMENT ON COLUMN public.transactions.payment_method IS 'How payment was made (cash, card, transfer, etc.)';
COMMENT ON COLUMN public.transactions.receipt_number IS 'Receipt or reference number';
COMMENT ON COLUMN public.transactions.receipt_url IS 'URL to receipt image or document';
COMMENT ON COLUMN public.transactions.tax_amount IS 'Tax amount included in transaction';
COMMENT ON COLUMN public.transactions.tax_rate IS 'Tax rate percentage applied';
COMMENT ON COLUMN public.transactions.is_recurring IS 'Whether this is a recurring transaction';
COMMENT ON COLUMN public.transactions.recurring_frequency IS 'How often recurring transaction repeats';
COMMENT ON COLUMN public.transactions.recurring_end_date IS 'When recurring transactions should stop';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_transactions_school_id ON public.transactions(school_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_contact_id ON public.transactions(contact_id);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_transactions_from_account_id ON public.transactions(from_account_id);
CREATE INDEX idx_transactions_to_account_id ON public.transactions(to_account_id);
CREATE INDEX idx_transactions_subscription_id ON public.transactions(subscription_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_is_recurring ON public.transactions(is_recurring);

-- Composite indexes for common queries
CREATE INDEX idx_transactions_school_date ON public.transactions(school_id, transaction_date);
CREATE INDEX idx_transactions_school_type ON public.transactions(school_id, type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions from their school
CREATE POLICY "School users can view transactions" 
ON public.transactions FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Admins and teachers can create transactions
CREATE POLICY "Admins and teachers can create transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = transactions.school_id
    )
);

-- Admins and teachers can update transactions
CREATE POLICY "Admins and teachers can update transactions" 
ON public.transactions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = transactions.school_id
    )
);

-- Only admins can delete transactions
CREATE POLICY "Admins can delete transactions" 
ON public.transactions FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = transactions.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_transactions_updated_at();
