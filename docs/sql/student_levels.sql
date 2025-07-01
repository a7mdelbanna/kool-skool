
-- =====================================================
-- STUDENT_LEVELS TABLE
-- =====================================================
-- Purpose: Define configurable student skill levels per school
-- Allows schools to customize their student progression system
-- =====================================================

CREATE TABLE public.student_levels (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Level information
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.student_levels IS 'Configurable student skill levels for progression tracking';
COMMENT ON COLUMN public.student_levels.id IS 'Unique identifier for each level';
COMMENT ON COLUMN public.student_levels.school_id IS 'Reference to the school defining this level';
COMMENT ON COLUMN public.student_levels.name IS 'Level name (e.g., Beginner, Intermediate, Advanced)';
COMMENT ON COLUMN public.student_levels.color IS 'Color code for visual identification in UI';
COMMENT ON COLUMN public.student_levels.sort_order IS 'Numeric order for level progression (0 = first level)';
COMMENT ON COLUMN public.student_levels.is_active IS 'Whether this level is active and available for assignment';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_student_levels_school_id ON public.student_levels(school_id);
CREATE INDEX idx_student_levels_sort_order ON public.student_levels(sort_order);
CREATE INDEX idx_student_levels_is_active ON public.student_levels(is_active);

-- Unique constraint to prevent duplicate level names per school
CREATE UNIQUE INDEX idx_student_levels_school_name_unique ON public.student_levels(school_id, name);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

-- Users can view levels from their school
CREATE POLICY "School users can view levels" 
ON public.student_levels FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only admins can manage levels
CREATE POLICY "Admins can manage levels" 
ON public.student_levels FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = student_levels.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_student_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_student_levels_updated_at
    BEFORE UPDATE ON public.student_levels
    FOR EACH ROW EXECUTE FUNCTION update_student_levels_updated_at();
