
-- =====================================================
-- USERS TABLE
-- =====================================================
-- Purpose: Core user authentication and profile information
-- Supports multiple user types: admin, teacher, student, superadmin
-- =====================================================

CREATE TABLE public.users (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Authentication fields
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT, -- Hashed password for security
    password_plain TEXT, -- Plain text password (consider removing in production)
    
    -- Profile information
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    
    -- System fields
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'superadmin')),
    school_id UUID REFERENCES public.schools(id),
    timezone TEXT DEFAULT 'UTC',
    
    -- Audit fields
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.users IS 'Core user table storing authentication and profile data for all system users';
COMMENT ON COLUMN public.users.id IS 'Unique identifier for each user';
COMMENT ON COLUMN public.users.email IS 'User email address, used for authentication';
COMMENT ON COLUMN public.users.password_hash IS 'Encrypted password hash for secure authentication';
COMMENT ON COLUMN public.users.password_plain IS 'Plain text password - should be removed in production for security';
COMMENT ON COLUMN public.users.role IS 'User role: admin (school administrator), teacher, student, or superadmin';
COMMENT ON COLUMN public.users.school_id IS 'Reference to the school this user belongs to (null for superadmin)';
COMMENT ON COLUMN public.users.timezone IS 'User preferred timezone for scheduling and notifications';
COMMENT ON COLUMN public.users.created_by IS 'Reference to the user who created this account';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_school_id ON public.users(school_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_created_by ON public.users(created_by);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and other users from their school
CREATE POLICY "Users can view own profile and school users" 
ON public.users FOR SELECT 
USING (
    id = auth.uid() OR 
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only admins and superadmins can insert users
CREATE POLICY "Admins can create users" 
ON public.users FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
    )
);

-- Users can update their own profile, admins can update school users
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (
    id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (role = 'superadmin' OR school_id = users.school_id)
    )
);

-- Only superadmins can delete users
CREATE POLICY "Superadmins can delete users" 
ON public.users FOR DELETE 
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
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();
