
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_count INTEGER NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  schedule JSONB NOT NULL, -- Store day/time schedule as JSON
  price_mode TEXT NOT NULL CHECK (price_mode IN ('perSession', 'fixed')),
  price_per_session DECIMAL(10,2),
  fixed_price DECIMAL(10,2),
  total_price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy to allow school members to view subscriptions for students in their school
CREATE POLICY "School members can view student subscriptions" ON public.subscriptions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = subscriptions.student_id 
    AND s.school_id = u.school_id
  )
);

-- Policy to allow school admins and teachers to insert subscriptions
CREATE POLICY "School admins and teachers can insert student subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = subscriptions.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy to allow school admins and teachers to update subscriptions
CREATE POLICY "School admins and teachers can update student subscriptions" ON public.subscriptions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = subscriptions.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy to allow school admins and teachers to delete subscriptions
CREATE POLICY "School admins and teachers can delete student subscriptions" ON public.subscriptions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = subscriptions.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Create a database function to get student subscriptions
CREATE OR REPLACE FUNCTION public.get_student_subscriptions(p_student_id UUID)
RETURNS TABLE(
  id UUID,
  student_id UUID,
  session_count INTEGER,
  duration_months INTEGER,
  start_date DATE,
  schedule JSONB,
  price_mode TEXT,
  price_per_session DECIMAL(10,2),
  fixed_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  currency TEXT,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.student_id,
    s.session_count,
    s.duration_months,
    s.start_date,
    s.schedule,
    s.price_mode,
    s.price_per_session,
    s.fixed_price,
    s.total_price,
    s.currency,
    s.notes,
    s.status,
    s.created_at
  FROM public.subscriptions s
  WHERE s.student_id = p_student_id
  ORDER BY s.created_at DESC;
END;
$function$;

-- Create sessions table to track individual lesson sessions
CREATE TABLE public.lesson_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for lesson sessions
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow school members to view sessions for students in their school
CREATE POLICY "School members can view student sessions" ON public.lesson_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = lesson_sessions.student_id 
    AND s.school_id = u.school_id
  )
);

-- Policy to allow school admins and teachers to insert sessions
CREATE POLICY "School admins and teachers can insert student sessions" ON public.lesson_sessions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = lesson_sessions.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy to allow school admins and teachers to update sessions
CREATE POLICY "School admins and teachers can update student sessions" ON public.lesson_sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = lesson_sessions.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);

-- Policy to allow school admins and teachers to delete sessions
CREATE POLICY "School admins and teachers can delete student sessions" ON public.lesson_sessions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.id = auth.uid()
    WHERE s.id = lesson_sessions.student_id 
    AND s.school_id = u.school_id
    AND u.role IN ('admin', 'teacher')
  )
);
