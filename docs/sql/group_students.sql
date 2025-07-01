
-- =====================================================
-- GROUP_STUDENTS TABLE
-- =====================================================
-- Purpose: Junction table linking students to groups
-- Tracks student enrollment in group classes
-- =====================================================

CREATE TABLE public.group_students (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    
    -- Enrollment tracking
    start_date DATE NOT NULL,
    end_date DATE, -- When student left the group
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.group_students IS 'Junction table linking students to group classes';
COMMENT ON COLUMN public.group_students.id IS 'Unique identifier for each group enrollment';
COMMENT ON COLUMN public.group_students.group_id IS 'Reference to the group';
COMMENT ON COLUMN public.group_students.student_id IS 'Reference to the enrolled student';
COMMENT ON COLUMN public.group_students.start_date IS 'Date when student joined the group';
COMMENT ON COLUMN public.group_students.end_date IS 'Date when student left the group (if applicable)';
COMMENT ON COLUMN public.group_students.status IS 'Enrollment status: active or inactive';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_group_students_group_id ON public.group_students(group_id);
CREATE INDEX idx_group_students_student_id ON public.group_students(student_id);
CREATE INDEX idx_group_students_status ON public.group_students(status);
CREATE INDEX idx_group_students_start_date ON public.group_students(start_date);

-- Unique constraint to prevent duplicate enrollments
CREATE UNIQUE INDEX idx_group_students_unique ON public.group_students(group_id, student_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.group_students ENABLE ROW LEVEL SECURITY;

-- Users can view group enrollments from their school
CREATE POLICY "School users can view group enrollments" 
ON public.group_students FOR SELECT 
USING (
    group_id IN (
        SELECT id FROM public.groups 
        WHERE school_id IN (
            SELECT school_id FROM public.users WHERE id = auth.uid()
        )
    ) OR
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

-- Admins and teachers can manage group enrollments
CREATE POLICY "Admins and teachers can manage enrollments" 
ON public.group_students FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.groups g ON g.school_id = u.school_id
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'teacher')
        AND g.id = group_students.group_id
    )
);
