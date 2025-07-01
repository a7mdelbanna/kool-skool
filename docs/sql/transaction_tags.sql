
-- =====================================================
-- TRANSACTION_TAGS TABLE
-- =====================================================
-- Purpose: Tag system for flexible transaction labeling
-- Allows multiple tags per transaction for advanced filtering
-- =====================================================

CREATE TABLE public.transaction_tags (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Tag information
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.transaction_tags IS 'Tag system for flexible transaction labeling and filtering';
COMMENT ON COLUMN public.transaction_tags.id IS 'Unique identifier for each tag';
COMMENT ON COLUMN public.transaction_tags.school_id IS 'Reference to the school owning this tag';
COMMENT ON COLUMN public.transaction_tags.name IS 'Tag name (e.g., Urgent, Recurring, Tax Deductible)';
COMMENT ON COLUMN public.transaction_tags.color IS 'Color code for visual identification in UI';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_transaction_tags_school_id ON public.transaction_tags(school_id);
CREATE INDEX idx_transaction_tags_name ON public.transaction_tags(name);

-- Unique constraint to prevent duplicate tag names per school
CREATE UNIQUE INDEX idx_transaction_tags_school_name_unique ON public.transaction_tags(school_id, name);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

-- Users can view tags from their school
CREATE POLICY "School users can view tags" 
ON public.transaction_tags FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Admins and teachers can manage tags
CREATE POLICY "Admins and teachers can manage tags" 
ON public.transaction_tags FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = transaction_tags.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_transaction_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transaction_tags_updated_at
    BEFORE UPDATE ON public.transaction_tags
    FOR EACH ROW EXECUTE FUNCTION update_transaction_tags_updated_at();
