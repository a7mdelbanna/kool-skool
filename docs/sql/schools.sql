
-- =====================================================
-- SCHOOLS TABLE
-- =====================================================
-- Purpose: Store information about tutoring schools/institutions
-- Each school is a separate tenant in the multi-tenant system
-- =====================================================

CREATE TABLE public.schools (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- School information
    name TEXT NOT NULL,
    logo TEXT, -- URL or path to school logo
    contact_info JSONB, -- Flexible contact information storage
    timezone TEXT DEFAULT 'UTC',
    
    -- Licensing
    license_id UUID REFERENCES public.licenses(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.schools IS 'Stores information about tutoring schools/institutions in the multi-tenant system';
COMMENT ON COLUMN public.schools.id IS 'Unique identifier for each school';
COMMENT ON COLUMN public.schools.name IS 'School name or institution name';
COMMENT ON COLUMN public.schools.logo IS 'URL or file path to the school logo image';
COMMENT ON COLUMN public.schools.contact_info IS 'JSON object containing flexible contact information (address, phone, email, etc.)';
COMMENT ON COLUMN public.schools.timezone IS 'Default timezone for the school, used for scheduling and reporting';
COMMENT ON COLUMN public.schools.license_id IS 'Reference to the software license for this school';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_schools_name ON public.schools(name);
CREATE INDEX idx_schools_license_id ON public.schools(license_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Users can only see their own school
CREATE POLICY "Users can view own school" 
ON public.schools FOR SELECT 
USING (
    id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only superadmins can create schools
CREATE POLICY "Superadmins can create schools" 
ON public.schools FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'superadmin'
    )
);

-- School admins can update their school, superadmins can update any
CREATE POLICY "Admins can update own school" 
ON public.schools FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (
            (role = 'admin' AND school_id = schools.id) OR
            role = 'superadmin'
        )
    )
);

-- Only superadmins can delete schools
CREATE POLICY "Superadmins can delete schools" 
ON public.schools FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'superadmin'
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW EXECUTE FUNCTION update_schools_updated_at();
