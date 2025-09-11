-- =====================================================
-- STUDENT PORTAL ENHANCEMENT MIGRATION
-- =====================================================
-- Purpose: Add features for comprehensive student portal
-- Including: school settings, student profiles, cancellation requests
-- =====================================================

-- 1. Add settings column to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT jsonb_build_object(
    'cancellation_notice_hours', 24,
    'allow_student_cancellation', true,
    'allow_payment_upload', true,
    'require_profile_completion', true,
    'enable_google_calendar', true,
    'enable_homework_submission', false,
    'enable_messaging', false,
    'payment_methods', jsonb_build_array('manual', 'stripe'),
    'student_permissions', jsonb_build_object(
        'can_view_grades', true,
        'can_download_materials', true,
        'can_submit_feedback', true,
        'can_request_sessions', false
    )
);

COMMENT ON COLUMN public.schools.settings IS 'School-specific settings for student portal features and permissions';

-- 2. Enhance students table with profile data and onboarding status
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT jsonb_build_object(
    'bio', '',
    'city', '',
    'date_of_birth', null,
    'emergency_contact', jsonb_build_object(
        'name', '',
        'phone', '',
        'relationship', ''
    ),
    'social_links', jsonb_build_object(
        'linkedin', '',
        'instagram', '',
        'facebook', ''
    ),
    'preferences', jsonb_build_object(
        'learning_style', '',
        'preferred_session_time', '',
        'language', 'en',
        'notification_preferences', jsonb_build_object(
            'email', true,
            'sms', false,
            'push', true
        )
    ),
    'medical_info', '',
    'profile_photo_url', ''
);

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.students.profile_data IS 'Extended profile information for student portal';
COMMENT ON COLUMN public.students.onboarding_completed IS 'Whether student has completed onboarding process';
COMMENT ON COLUMN public.students.onboarding_completed_at IS 'Timestamp when onboarding was completed';

-- 3. Create cancellation_requests table
CREATE TABLE IF NOT EXISTS public.cancellation_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Request details
    reason TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('cancel', 'reschedule')),
    requested_date TIMESTAMP WITH TIME ZONE, -- For reschedule requests
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    processed_by UUID REFERENCES public.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    
    -- Cancellation policy tracking
    hours_before_session INTEGER, -- Hours between request and session time
    within_notice_period BOOLEAN,
    
    -- Outcome
    new_session_id UUID REFERENCES public.lesson_sessions(id), -- If session was moved
    counts_as_completed BOOLEAN DEFAULT false, -- If cancelled outside notice period
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_session_id ON public.cancellation_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_student_id ON public.cancellation_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_school_id ON public.cancellation_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON public.cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_created_at ON public.cancellation_requests(created_at DESC);

-- Comments
COMMENT ON TABLE public.cancellation_requests IS 'Student requests for session cancellation or rescheduling';
COMMENT ON COLUMN public.cancellation_requests.request_type IS 'Type of request: cancel or reschedule';
COMMENT ON COLUMN public.cancellation_requests.hours_before_session IS 'Hours between request time and session time';
COMMENT ON COLUMN public.cancellation_requests.within_notice_period IS 'Whether request was made within school notice period';
COMMENT ON COLUMN public.cancellation_requests.new_session_id IS 'Reference to new session if rescheduled';

-- 4. Create payment_submissions table for tracking manual payment uploads
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Payment details
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    
    -- Proof of payment
    proof_urls TEXT[], -- Array of uploaded file URLs
    submission_notes TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_submissions_student_id ON public.payment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_school_id ON public.payment_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON public.payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_created_at ON public.payment_submissions(created_at DESC);

COMMENT ON TABLE public.payment_submissions IS 'Student-submitted payment proofs for manual payment processing';

-- 5. Create student_resources table for course materials
CREATE TABLE IF NOT EXISTS public.student_resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    
    -- Resource details
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'video', 'link', 'assignment')),
    file_url TEXT,
    external_link TEXT,
    
    -- Access control
    available_to_all BOOLEAN DEFAULT false,
    specific_student_ids UUID[], -- If not available to all
    
    -- Organization
    category TEXT,
    tags TEXT[],
    order_index INTEGER DEFAULT 0,
    
    -- Tracking
    is_active BOOLEAN DEFAULT true,
    views_count INTEGER DEFAULT 0,
    
    -- Audit fields
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_student_resources_school_id ON public.student_resources(school_id);
CREATE INDEX IF NOT EXISTS idx_student_resources_course_id ON public.student_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_student_resources_resource_type ON public.student_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_student_resources_is_active ON public.student_resources(is_active);

COMMENT ON TABLE public.student_resources IS 'Learning resources and materials available to students';

-- 6. Create student_achievements table for gamification
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    
    -- Achievement details
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    icon_url TEXT,
    
    -- Progress tracking
    progress_current INTEGER DEFAULT 0,
    progress_target INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    
    -- Dates
    earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_is_completed ON public.student_achievements(is_completed);

COMMENT ON TABLE public.student_achievements IS 'Student achievements and badges for gamification';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Cancellation Requests RLS
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own cancellation requests" 
ON public.cancellation_requests FOR SELECT 
USING (
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Students can create cancellation requests" 
ON public.cancellation_requests FOR INSERT 
WITH CHECK (
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

CREATE POLICY "School staff can manage cancellation requests" 
ON public.cancellation_requests FOR ALL 
USING (
    school_id IN (
        SELECT school_id FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
);

-- Payment Submissions RLS
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own payment submissions" 
ON public.payment_submissions FOR SELECT 
USING (
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Students can create payment submissions" 
ON public.payment_submissions FOR INSERT 
WITH CHECK (
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

CREATE POLICY "School staff can manage payment submissions" 
ON public.payment_submissions FOR ALL 
USING (
    school_id IN (
        SELECT school_id FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
);

-- Student Resources RLS
ALTER TABLE public.student_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view available resources" 
ON public.student_resources FOR SELECT 
USING (
    is_active = true AND (
        available_to_all = true OR
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.user_id = auth.uid()
            AND (
                student_resources.specific_student_ids IS NULL OR
                s.id = ANY(student_resources.specific_student_ids)
            )
        )
    )
);

CREATE POLICY "Teachers can manage resources" 
ON public.student_resources FOR ALL 
USING (
    school_id IN (
        SELECT school_id FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
);

-- Student Achievements RLS
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own achievements" 
ON public.student_achievements FOR SELECT 
USING (
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

CREATE POLICY "System can manage achievements" 
ON public.student_achievements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update triggers for new tables
CREATE TRIGGER trigger_cancellation_requests_updated_at
    BEFORE UPDATE ON public.cancellation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_payment_submissions_updated_at
    BEFORE UPDATE ON public.payment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_student_resources_updated_at
    BEFORE UPDATE ON public.student_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;