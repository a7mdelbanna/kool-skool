
-- Create a table for student levels
CREATE TABLE public.student_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  school_id uuid NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for the student_levels table
CREATE POLICY "Users can view levels for their school" 
  ON public.student_levels 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.school_id = student_levels.school_id
    )
  );

CREATE POLICY "Admins can insert levels for their school" 
  ON public.student_levels 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.school_id = student_levels.school_id
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update levels for their school" 
  ON public.student_levels 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.school_id = student_levels.school_id
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete levels for their school" 
  ON public.student_levels 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.school_id = student_levels.school_id
      AND users.role = 'admin'
    )
  );

-- Insert default levels for existing schools
INSERT INTO public.student_levels (name, school_id, sort_order)
SELECT 'Beginner', id, 1 FROM public.schools
UNION ALL
SELECT 'Intermediate', id, 2 FROM public.schools
UNION ALL
SELECT 'Advanced', id, 3 FROM public.schools
UNION ALL
SELECT 'Fluent', id, 4 FROM public.schools;
