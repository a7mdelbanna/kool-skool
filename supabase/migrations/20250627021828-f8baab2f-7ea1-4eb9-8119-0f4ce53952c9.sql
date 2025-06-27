
-- First, let's check what constraints exist and remove the problematic one
DO $$
BEGIN
    -- Drop the old hardcoded constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'contacts_type_check' 
        AND table_name = 'contacts'
    ) THEN
        ALTER TABLE public.contacts DROP CONSTRAINT contacts_type_check;
    END IF;
    
    -- Drop our previous attempt at the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'contacts_type_valid' 
        AND table_name = 'contacts'
    ) THEN
        ALTER TABLE public.contacts DROP CONSTRAINT contacts_type_valid;
    END IF;
END $$;

-- Instead of using a CHECK constraint (which has limitations), 
-- let's create a trigger that validates the contact type
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

-- Create the trigger
DROP TRIGGER IF EXISTS validate_contact_type_trigger ON public.contacts;
CREATE TRIGGER validate_contact_type_trigger
    BEFORE INSERT OR UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION validate_contact_type();

-- Ensure the foreign key constraint exists for school_id
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id)
ON DELETE CASCADE;
