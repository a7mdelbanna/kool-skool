
-- Create contact_types table to store dynamic contact types
CREATE TABLE public.contact_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to schools table
ALTER TABLE public.contact_types 
ADD CONSTRAINT contact_types_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- Add index for better performance
CREATE INDEX idx_contact_types_school_id ON public.contact_types(school_id);

-- Add unique constraint to prevent duplicate contact type names per school
ALTER TABLE public.contact_types 
ADD CONSTRAINT contact_types_school_name_unique 
UNIQUE (school_id, name);

-- Insert default contact types for existing schools
INSERT INTO public.contact_types (school_id, name, color)
SELECT DISTINCT s.id, 'Client', '#3B82F6'
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_types ct 
  WHERE ct.school_id = s.id AND ct.name = 'Client'
);

INSERT INTO public.contact_types (school_id, name, color)
SELECT DISTINCT s.id, 'Vendor', '#10B981'
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_types ct 
  WHERE ct.school_id = s.id AND ct.name = 'Vendor'
);

INSERT INTO public.contact_types (school_id, name, color)
SELECT DISTINCT s.id, 'Service Provider', '#F59E0B'
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_types ct 
  WHERE ct.school_id = s.id AND ct.name = 'Service Provider'
);

INSERT INTO public.contact_types (school_id, name, color)
SELECT DISTINCT s.id, 'Partner', '#8B5CF6'
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_types ct 
  WHERE ct.school_id = s.id AND ct.name = 'Partner'
);

INSERT INTO public.contact_types (school_id, name, color)
SELECT DISTINCT s.id, 'Supplier', '#EF4444'
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_types ct 
  WHERE ct.school_id = s.id AND ct.name = 'Supplier'
);

INSERT INTO public.contact_types (school_id, name, color)
SELECT DISTINCT s.id, 'Contractor', '#F97316'
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_types ct 
  WHERE ct.school_id = s.id AND ct.name = 'Contractor'
);

-- Create RPC function to get school contact types
CREATE OR REPLACE FUNCTION public.get_school_contact_types(p_school_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  color text,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.color,
    ct.is_active,
    ct.created_at
  FROM public.contact_types ct
  WHERE ct.school_id = p_school_id 
    AND ct.is_active = true
  ORDER BY ct.name ASC;
END;
$$;
