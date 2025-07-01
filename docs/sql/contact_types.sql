
-- =====================================================
-- CONTACT_TYPES TABLE
-- =====================================================
-- Purpose: Define dynamic contact type categories for each school
-- Allows schools to customize their contact categorization
-- =====================================================

CREATE TABLE public.contact_types (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Type information
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.contact_types IS 'Dynamic contact type categories configurable per school';
COMMENT ON COLUMN public.contact_types.id IS 'Unique identifier for each contact type';
COMMENT ON COLUMN public.contact_types.school_id IS 'Reference to the school defining this contact type';
COMMENT ON COLUMN public.contact_types.name IS 'Contact type name (e.g., Vendor, Supplier, Parent)';
COMMENT ON COLUMN public.contact_types.color IS 'Color code for visual identification in UI';
COMMENT ON COLUMN public.contact_types.is_active IS 'Whether this contact type is active and available for use';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_contact_types_school_id ON public.contact_types(school_id);
CREATE INDEX idx_contact_types_name ON public.contact_types(name);
CREATE INDEX idx_contact_types_is_active ON public.contact_types(is_active);

-- Unique constraint to prevent duplicate contact type names per school
CREATE UNIQUE INDEX idx_contact_types_school_name_unique ON public.contact_types(school_id, name);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.contact_types ENABLE ROW LEVEL SECURITY;

-- Users can view contact types from their school
CREATE POLICY "School users can view contact types" 
ON public.contact_types FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only admins can manage contact types
CREATE POLICY "Admins can manage contact types" 
ON public.contact_types FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = contact_types.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_contact_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contact_types_updated_at
    BEFORE UPDATE ON public.contact_types
    FOR EACH ROW EXECUTE FUNCTION update_contact_types_updated_at();
