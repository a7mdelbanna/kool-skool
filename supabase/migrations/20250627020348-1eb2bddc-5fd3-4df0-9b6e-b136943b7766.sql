
-- First, let's check what the current constraint allows and then update it
-- Drop the existing constraint
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_type_check;

-- Add the new constraint with all the contact types used in the application
ALTER TABLE public.contacts ADD CONSTRAINT contacts_type_check 
  CHECK (type IN ('Client', 'Vendor', 'Service Provider', 'Partner', 'Supplier', 'Contractor'));
