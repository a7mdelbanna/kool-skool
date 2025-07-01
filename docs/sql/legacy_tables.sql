
-- =====================================================
-- LEGACY TABLES
-- =====================================================
-- Purpose: Legacy tables that may still be referenced in the system
-- These tables are being phased out in favor of the unified transactions table
-- =====================================================

-- =====================================================
-- STUDENT_PAYMENTS TABLE (Legacy)
-- =====================================================
-- Being replaced by transactions table with type='income'
CREATE TABLE public.student_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
    notes TEXT,
    contact_id UUID REFERENCES public.contacts(id),
    account_id UUID REFERENCES public.accounts(id),
    category_id UUID REFERENCES public.transaction_categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_payments IS 'Legacy student payments table - being replaced by transactions';

-- =====================================================
-- EXPENSES TABLE (Legacy)
-- =====================================================
-- Being replaced by transactions table with type='expense'
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
    notes TEXT,
    contact_id UUID REFERENCES public.contacts(id),
    account_id UUID REFERENCES public.accounts(id),
    category_id UUID REFERENCES public.transaction_categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.expenses IS 'Legacy expenses table - being replaced by transactions';

-- =====================================================
-- TRANSFERS TABLE (Legacy)
-- =====================================================
-- Being replaced by transactions table with type='transfer'
CREATE TABLE public.transfers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    transfer_date DATE NOT NULL,
    description TEXT NOT NULL,
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
    notes TEXT,
    contact_id UUID REFERENCES public.contacts(id),
    from_account_id UUID REFERENCES public.accounts(id),
    to_account_id UUID REFERENCES public.accounts(id),
    category_id UUID REFERENCES public.transaction_categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transfers IS 'Legacy transfers table - being replaced by transactions';

-- =====================================================
-- JUNCTION TABLES
-- =====================================================

-- Contact tags junction table
CREATE TABLE public.contact_tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(contact_id, tag_id)
);

COMMENT ON TABLE public.contact_tags IS 'Junction table linking contacts to tags';

-- Payment tags junction table
CREATE TABLE public.payment_tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.student_payments(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(payment_id, tag_id)
);

COMMENT ON TABLE public.payment_tags IS 'Junction table linking payments to tags - legacy';

-- =====================================================
-- LEGACY TABLE INDEXES
-- =====================================================
CREATE INDEX idx_student_payments_student_id ON public.student_payments(student_id);
CREATE INDEX idx_student_payments_payment_date ON public.student_payments(payment_date);
CREATE INDEX idx_student_payments_status ON public.student_payments(status);

CREATE INDEX idx_expenses_school_id ON public.expenses(school_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);

CREATE INDEX idx_transfers_school_id ON public.transfers(school_id);
CREATE INDEX idx_transfers_transfer_date ON public.transfers(transfer_date);

CREATE INDEX idx_contact_tags_contact_id ON public.contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON public.contact_tags(tag_id);

CREATE INDEX idx_payment_tags_payment_id ON public.payment_tags(payment_id);
CREATE INDEX idx_payment_tags_tag_id ON public.payment_tags(tag_id);
