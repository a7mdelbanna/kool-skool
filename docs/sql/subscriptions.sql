
-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
-- Purpose: Track student lesson subscriptions and packages
-- Defines how many lessons a student has purchased and scheduling
-- =====================================================

CREATE TABLE public.subscriptions (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    
    -- Subscription configuration
    subscription_type TEXT NOT NULL DEFAULT 'individual' CHECK (subscription_type IN ('individual', 'group')),
    session_count INTEGER NOT NULL,
    duration_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    schedule JSONB NOT NULL, -- JSON array of {day, time} objects
    
    -- Pricing configuration
    price_mode TEXT NOT NULL CHECK (price_mode IN ('perSession', 'fixed')),
    price_per_session NUMERIC,
    fixed_price NUMERIC,
    total_price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Status and tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
    sessions_completed INTEGER DEFAULT 0,
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.subscriptions IS 'Student lesson subscriptions and packages';
COMMENT ON COLUMN public.subscriptions.id IS 'Unique identifier for each subscription';
COMMENT ON COLUMN public.subscriptions.student_id IS 'Reference to the student who owns this subscription';
COMMENT ON COLUMN public.subscriptions.group_id IS 'Reference to group (for group subscriptions only)';
COMMENT ON COLUMN public.subscriptions.subscription_type IS 'Type: individual (1-on-1) or group lessons';
COMMENT ON COLUMN public.subscriptions.session_count IS 'Total number of sessions included';
COMMENT ON COLUMN public.subscriptions.duration_months IS 'Subscription duration in months';
COMMENT ON COLUMN public.subscriptions.start_date IS 'When the subscription starts';
COMMENT ON COLUMN public.subscriptions.end_date IS 'When the subscription ends (calculated or manual)';
COMMENT ON COLUMN public.subscriptions.schedule IS 'JSON array of schedule objects with day and time';
COMMENT ON COLUMN public.subscriptions.price_mode IS 'Pricing model: perSession or fixed total';
COMMENT ON COLUMN public.subscriptions.price_per_session IS 'Price per session (perSession mode)';
COMMENT ON COLUMN public.subscriptions.fixed_price IS 'Fixed total price (fixed mode)';
COMMENT ON COLUMN public.subscriptions.total_price IS 'Total subscription price';
COMMENT ON COLUMN public.subscriptions.currency IS 'Currency code for pricing';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: active, inactive, completed, cancelled';
COMMENT ON COLUMN public.subscriptions.sessions_completed IS 'Number of sessions completed so far';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_subscriptions_student_id ON public.subscriptions(student_id);
CREATE INDEX idx_subscriptions_group_id ON public.subscriptions(group_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_start_date ON public.subscriptions(start_date);
CREATE INDEX idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX idx_subscriptions_subscription_type ON public.subscriptions(subscription_type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view subscriptions from their school, students can view their own
CREATE POLICY "School users can view subscriptions" 
ON public.subscriptions FOR SELECT 
USING (
    student_id IN (
        SELECT id FROM public.students 
        WHERE school_id IN (
            SELECT school_id FROM public.users WHERE id = auth.uid()
        ) OR user_id = auth.uid()
    )
);

-- Admins and teachers can create subscriptions
CREATE POLICY "Admins and teachers can create subscriptions" 
ON public.subscriptions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.students s ON s.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'teacher')
        AND s.id = subscriptions.student_id
    )
);

-- Admins and teachers can update subscriptions
CREATE POLICY "Admins and teachers can update subscriptions" 
ON public.subscriptions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.students s ON s.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'teacher')
        AND s.id = subscriptions.student_id
    )
);

-- Only admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions" 
ON public.subscriptions FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.students s ON s.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
        AND s.id = subscriptions.student_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();
