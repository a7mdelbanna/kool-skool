
-- =====================================================
-- LICENSES TABLE
-- =====================================================
-- Purpose: Software licensing system for school subscriptions
-- Manages school access and subscription validity
-- =====================================================

CREATE TABLE public.licenses (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- License information
    license_key TEXT NOT NULL UNIQUE,
    duration_days INTEGER DEFAULT 365,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.licenses IS 'Software licensing system for school subscription management';
COMMENT ON COLUMN public.licenses.id IS 'Unique identifier for each license';
COMMENT ON COLUMN public.licenses.license_key IS 'Unique license key string';
COMMENT ON COLUMN public.licenses.duration_days IS 'License duration in days from activation';
COMMENT ON COLUMN public.licenses.expires_at IS 'License expiration timestamp';
COMMENT ON COLUMN public.licenses.is_active IS 'Whether the license is currently active';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_licenses_license_key ON public.licenses(license_key);
CREATE INDEX idx_licenses_expires_at ON public.licenses(expires_at);
CREATE INDEX idx_licenses_is_active ON public.licenses(is_active);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage licenses
CREATE POLICY "Superadmins can manage licenses" 
ON public.licenses FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'superadmin'
    )
);

-- School admins can view their school's license
CREATE POLICY "School admins can view own license" 
ON public.licenses FOR SELECT 
USING (
    id IN (
        SELECT license_id FROM public.schools 
        WHERE id IN (
            SELECT school_id FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);
