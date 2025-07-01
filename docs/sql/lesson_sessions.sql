
-- =====================================================
-- LESSON_SESSIONS TABLE
-- =====================================================
-- Purpose: Individual lesson session records for attendance and scheduling
-- Each session represents one lesson occurrence
-- =====================================================

CREATE TABLE public.lesson_sessions (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    
    -- Session scheduling
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Session tracking
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'absent', 'present')),
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    cost NUMERIC NOT NULL,
    
    -- Session management
    index_in_sub INTEGER, -- Position in subscription (1, 2, 3, etc.)
    original_session_index INTEGER, -- Original position (for rescheduled sessions)
    moved_from_session_id UUID REFERENCES public.lesson_sessions(id),
    counts_toward_completion BOOLEAN DEFAULT true,
    
    -- Notes and observations
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.lesson_sessions IS 'Individual lesson session records for attendance tracking';
COMMENT ON COLUMN public.lesson_sessions.id IS 'Unique identifier for each lesson session';
COMMENT ON COLUMN public.lesson_sessions.subscription_id IS 'Reference to the parent subscription';
COMMENT ON COLUMN public.lesson_sessions.student_id IS 'Reference to the student taking the lesson';
COMMENT ON COLUMN public.lesson_sessions.group_id IS 'Reference to group (for group lessons only)';
COMMENT ON COLUMN public.lesson_sessions.scheduled_date IS 'Date and time when lesson is scheduled';
COMMENT ON COLUMN public.lesson_sessions.duration_minutes IS 'Length of the lesson in minutes';
COMMENT ON COLUMN public.lesson_sessions.status IS 'Session status: scheduled, completed, cancelled, absent, present';
COMMENT ON COLUMN public.lesson_sessions.payment_status IS 'Payment status: paid, pending, refunded';
COMMENT ON COLUMN public.lesson_sessions.cost IS 'Cost of this individual session';
COMMENT ON COLUMN public.lesson_sessions.index_in_sub IS 'Session number within the subscription (1, 2, 3...)';
COMMENT ON COLUMN public.lesson_sessions.original_session_index IS 'Original session number (for rescheduled sessions)';
COMMENT ON COLUMN public.lesson_sessions.moved_from_session_id IS 'Reference to original session if this is a rescheduled session';
COMMENT ON COLUMN public.lesson_sessions.counts_toward_completion IS 'Whether this session counts toward subscription completion';
COMMENT ON COLUMN public.lesson_sessions.notes IS 'Teacher notes, observations, or lesson summary';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_lesson_sessions_subscription_id ON public.lesson_sessions(subscription_id);
CREATE INDEX idx_lesson_sessions_student_id ON public.lesson_sessions(student_id);
CREATE INDEX idx_lesson_sessions_group_id ON public.lesson_sessions(group_id);
CREATE INDEX idx_lesson_sessions_scheduled_date ON public.lesson_sessions(scheduled_date);
CREATE INDEX idx_lesson_sessions_status ON public.lesson_sessions(status);
CREATE INDEX idx_lesson_sessions_payment_status ON public.lesson_sessions(payment_status);
CREATE INDEX idx_lesson_sessions_index_in_sub ON public.lesson_sessions(index_in_sub);

-- Composite index for calendar queries
CREATE INDEX idx_lesson_sessions_date_student ON public.lesson_sessions(scheduled_date, student_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions from their school, students can view their own
CREATE POLICY "School users can view sessions" 
ON public.lesson_sessions FOR SELECT 
USING (
    student_id IN (
        SELECT id FROM public.students 
        WHERE school_id IN (
            SELECT school_id FROM public.users WHERE id = auth.uid()
        ) OR user_id = auth.uid()
    )
);

-- Admins and teachers can create sessions
CREATE POLICY "Admins and teachers can create sessions" 
ON public.lesson_sessions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.students s ON s.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'teacher')
        AND s.id = lesson_sessions.student_id
    )
);

-- Admins and teachers can update sessions
CREATE POLICY "Admins and teachers can update sessions" 
ON public.lesson_sessions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.students s ON s.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'teacher')
        AND s.id = lesson_sessions.student_id
    )
);

-- Only admins can delete sessions
CREATE POLICY "Admins can delete sessions" 
ON public.lesson_sessions FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.students s ON s.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
        AND s.id = lesson_sessions.student_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_lesson_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lesson_sessions_updated_at
    BEFORE UPDATE ON public.lesson_sessions
    FOR EACH ROW EXECUTE FUNCTION update_lesson_sessions_updated_at();
