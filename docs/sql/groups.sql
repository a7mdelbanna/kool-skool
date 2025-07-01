
-- =====================================================
-- GROUPS TABLE
-- =====================================================
-- Purpose: Store group class information and scheduling
-- Groups allow multiple students to take lessons together
-- =====================================================

CREATE TABLE public.groups (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id),
    course_id UUID REFERENCES public.courses(id),
    
    -- Group information
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    
    -- Session configuration
    session_count INTEGER NOT NULL,
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    schedule JSONB NOT NULL, -- JSON array of {day, time} objects
    
    -- Pricing configuration
    price_mode TEXT NOT NULL CHECK (price_mode IN ('perSession', 'fixed')),
    price_per_session NUMERIC,
    total_price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.groups IS 'Group classes with multiple students learning together';
COMMENT ON COLUMN public.groups.id IS 'Unique identifier for each group';
COMMENT ON COLUMN public.groups.school_id IS 'Reference to the school offering this group';
COMMENT ON COLUMN public.groups.teacher_id IS 'Reference to the assigned teacher';
COMMENT ON COLUMN public.groups.course_id IS 'Reference to the course being taught';
COMMENT ON COLUMN public.groups.name IS 'Group name or identifier';
COMMENT ON COLUMN public.groups.description IS 'Optional description of the group';
COMMENT ON COLUMN public.groups.status IS 'Group status: active, inactive, or completed';
COMMENT ON COLUMN public.groups.session_count IS 'Total number of sessions in this group';
COMMENT ON COLUMN public.groups.session_duration_minutes IS 'Duration of each session in minutes';
COMMENT ON COLUMN public.groups.schedule IS 'JSON array of schedule objects with day and time';
COMMENT ON COLUMN public.groups.price_mode IS 'Pricing model: perSession or fixed total price';
COMMENT ON COLUMN public.groups.price_per_session IS 'Price per session (when using perSession mode)';
COMMENT ON COLUMN public.groups.total_price IS 'Total price for the entire group course';
COMMENT ON COLUMN public.groups.currency IS 'Currency code for pricing';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_groups_school_id ON public.groups(school_id);
CREATE INDEX idx_groups_teacher_id ON public.groups(teacher_id);
CREATE INDEX idx_groups_course_id ON public.groups(course_id);
CREATE INDEX idx_groups_status ON public.groups(status);
CREATE INDEX idx_groups_name ON public.groups(name);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Users can view groups from their school
CREATE POLICY "School users can view groups" 
ON public.groups FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Admins and teachers can create groups
CREATE POLICY "Admins and teachers can create groups" 
ON public.groups FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = groups.school_id
    )
);

-- Admins and assigned teachers can update groups
CREATE POLICY "Admins and teachers can update groups" 
ON public.groups FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND school_id = groups.school_id
        AND (role = 'admin' OR id = groups.teacher_id)
    )
);

-- Only admins can delete groups
CREATE POLICY "Admins can delete groups" 
ON public.groups FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = groups.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION update_groups_updated_at();
