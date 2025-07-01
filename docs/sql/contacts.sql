
-- =====================================================
-- CONTACTS TABLE
-- =====================================================
-- Purpose: Store business contacts (vendors, suppliers, parents, etc.)
-- Used for financial transactions and communication management
-- =====================================================

CREATE TABLE public.contacts (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Contact information
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- References contact_types table
    email TEXT,
    phone TEXT,
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.contacts IS 'Business contacts including vendors, suppliers, parents, and partners';
COMMENT ON COLUMN public.contacts.id IS 'Unique identifier for each contact';
COMMENT ON COLUMN public.contacts.school_id IS 'Reference to the school owning this contact';
COMMENT ON COLUMN public.contacts.name IS 'Contact name or business name';
COMMENT ON COLUMN public.contacts.type IS 'Contact type (must exist in contact_types table)';
COMMENT ON COLUMN public.contacts.email IS 'Contact email address';
COMMENT ON COLUMN public.contacts.phone IS 'Contact phone number';
COMMENT ON COLUMN public.contacts.notes IS 'Additional notes or information about the contact';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_contacts_school_id ON public.contacts(school_id);
CREATE INDEX idx_contacts_type ON public.contacts(type);
CREATE INDEX idx_contacts_name ON public.contacts(name);
CREATE INDEX idx_contacts_email ON public.contacts(email);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Note: RLS is currently disabled as per migration files
-- Users can view contacts from their school
CREATE POLICY "School users can view contacts" 
ON public.contacts FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Admins and teachers can manage contacts
CREATE POLICY "Admins and teachers can manage contacts" 
ON public.contacts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = contacts.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();

-- Contact type validation trigger
CREATE OR REPLACE FUNCTION validate_contact_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the contact type exists and is active for this school
    IF NOT EXISTS (
        SELECT 1 FROM public.contact_types ct 
        WHERE ct.name = NEW.type 
        AND ct.school_id = NEW.school_id 
        AND ct.is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid contact type: %. Contact type must exist and be active for this school.', NEW.type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_contact_type
    BEFORE INSERT OR UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION validate_contact_type();
