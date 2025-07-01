
-- =====================================================
-- TRANSACTION_CATEGORIES TABLE
-- =====================================================
-- Purpose: Hierarchical categorization system for transactions
-- Supports parent-child relationships for nested categories
-- =====================================================

CREATE TABLE public.transaction_categories (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
    
    -- Category information
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    color TEXT NOT NULL DEFAULT '#3B82F6',
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.transaction_categories IS 'Hierarchical categorization system for organizing transactions';
COMMENT ON COLUMN public.transaction_categories.id IS 'Unique identifier for each category';
COMMENT ON COLUMN public.transaction_categories.school_id IS 'Reference to the school owning this category';
COMMENT ON COLUMN public.transaction_categories.parent_id IS 'Reference to parent category (for hierarchical structure)';
COMMENT ON COLUMN public.transaction_categories.name IS 'Category name (e.g., Payroll, Marketing, Utilities)';
COMMENT ON COLUMN public.transaction_categories.type IS 'Category type: income, expense, or transfer';
COMMENT ON COLUMN public.transaction_categories.color IS 'Color code for visual identification in UI';
COMMENT ON COLUMN public.transaction_categories.is_active IS 'Whether this category is active and available for use';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_transaction_categories_school_id ON public.transaction_categories(school_id);
CREATE INDEX idx_transaction_categories_parent_id ON public.transaction_categories(parent_id);
CREATE INDEX idx_transaction_categories_type ON public.transaction_categories(type);
CREATE INDEX idx_transaction_categories_is_active ON public.transaction_categories(is_active);

-- Unique constraint to prevent duplicate category names per parent per school
CREATE UNIQUE INDEX idx_transaction_categories_unique ON public.transaction_categories(school_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

-- Users can view categories from their school
CREATE POLICY "School users can view categories" 
ON public.transaction_categories FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" 
ON public.transaction_categories FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = transaction_categories.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_transaction_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transaction_categories_updated_at
    BEFORE UPDATE ON public.transaction_categories
    FOR EACH ROW EXECUTE FUNCTION update_transaction_categories_updated_at();

-- Prevent circular references in category hierarchy
CREATE OR REPLACE FUNCTION prevent_category_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
    current_parent_id UUID;
    visited_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Only check if parent_id is being set
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check for self-reference
    IF NEW.id = NEW.parent_id THEN
        RAISE EXCEPTION 'Category cannot be its own parent';
    END IF;
    
    -- Check for circular reference by traversing up the hierarchy
    current_parent_id := NEW.parent_id;
    visited_ids := array_append(visited_ids, NEW.id);
    
    WHILE current_parent_id IS NOT NULL LOOP
        -- If we've seen this ID before, there's a circular reference
        IF current_parent_id = ANY(visited_ids) THEN
            RAISE EXCEPTION 'Circular reference detected in category hierarchy';
        END IF;
        
        visited_ids := array_append(visited_ids, current_parent_id);
        
        -- Get the next parent
        SELECT parent_id INTO current_parent_id 
        FROM public.transaction_categories 
        WHERE id = current_parent_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_category_circular_reference
    BEFORE INSERT OR UPDATE ON public.transaction_categories
    FOR EACH ROW EXECUTE FUNCTION prevent_category_circular_reference();
