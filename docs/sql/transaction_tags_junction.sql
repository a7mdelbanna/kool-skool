
-- =====================================================
-- TRANSACTION_TAGS_JUNCTION TABLE
-- =====================================================
-- Purpose: Many-to-many relationship between transactions and tags
-- Allows multiple tags per transaction for flexible categorization
-- =====================================================

CREATE TABLE public.transaction_tags_junction (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.transaction_tags_junction IS 'Junction table linking transactions to multiple tags';
COMMENT ON COLUMN public.transaction_tags_junction.id IS 'Unique identifier for each tag assignment';
COMMENT ON COLUMN public.transaction_tags_junction.transaction_id IS 'Reference to the tagged transaction';
COMMENT ON COLUMN public.transaction_tags_junction.tag_id IS 'Reference to the applied tag';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_transaction_tags_junction_transaction ON public.transaction_tags_junction(transaction_id);
CREATE INDEX idx_transaction_tags_junction_tag ON public.transaction_tags_junction(tag_id);

-- Unique constraint to prevent duplicate tag assignments
CREATE UNIQUE INDEX idx_transaction_tags_junction_unique ON public.transaction_tags_junction(transaction_id, tag_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.transaction_tags_junction ENABLE ROW LEVEL SECURITY;

-- Users can view tag assignments for transactions from their school
CREATE POLICY "School users can view tag assignments" 
ON public.transaction_tags_junction FOR SELECT 
USING (
    transaction_id IN (
        SELECT id FROM public.transactions 
        WHERE school_id IN (
            SELECT school_id FROM public.users WHERE id = auth.uid()
        )
    )
);

-- Admins and teachers can manage tag assignments
CREATE POLICY "Admins and teachers can manage tag assignments" 
ON public.transaction_tags_junction FOR ALL 
USING (
    transaction_id IN (
        SELECT id FROM public.transactions 
        WHERE school_id IN (
            SELECT school_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'teacher')
        )
    )
);
