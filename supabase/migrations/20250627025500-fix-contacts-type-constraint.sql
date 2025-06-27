
-- Drop the existing contacts_type_check constraint
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_type_check;

-- Add a new constraint that references the contact_types table
-- This ensures that the contact type must exist in the contact_types table for the same school
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_type_valid 
CHECK (
  EXISTS (
    SELECT 1 FROM public.contact_types ct 
    WHERE ct.name = contacts.type 
    AND ct.school_id = contacts.school_id 
    AND ct.is_active = true
  )
);

-- Add foreign key constraint to schools table for contacts if it doesn't exist
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id)
ON DELETE CASCADE;
