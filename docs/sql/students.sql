
-- =====================================================
-- STUDENTS TABLE
-- =====================================================
-- Purpose: Store student-specific information and link to user accounts
-- Extends user table with student-specific fields
-- =====================================================

CREATE TABLE public.students (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id), -- Assigned teacher
    course_id UUID REFERENCES public.courses(id), -- Enrolled course
    
    -- Student-specific information
    birthday DATE,
    age_group TEXT, -- Child, Teen, Adult, etc.
    level TEXT, -- Beginner, Intermediate, Advanced
    
    -- Contact information (additional to user table)
    phone TEXT,
    whatsapp TEXT,
    telegram TEXT,
    instagram TEXT,
    
    -- Payment tracking
    next_payment_date TIMESTAMP WITH TIME ZONE,
    next_payment_amount NUMERIC,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.students IS 'Student-specific information extending the users table';
COMMENT ON COLUMN public.students.id IS 'Unique identifier for each student record';
COMMENT ON COLUMN public.students.school_id IS 'Reference to the school this student belongs to';
COMMENT ON COLUMN public.students.user_id IS 'Reference to the corresponding user account';
COMMENT ON COLUMN public.students.teacher_id IS 'Reference to the assigned teacher (optional)';
COMMENT ON COLUMN public.students.course_id IS 'Reference to the enrolled course (optional)';
COMMENT ON COLUMN public.students.birthday IS 'Student date of birth for age tracking';
COMMENT ON COLUMN public.students.age_group IS 'Age category: Child, Teen, Adult, etc.';
COMMENT ON COLUMN public.students.level IS 'Academic level: Beginner, Intermediate, Advanced, etc.';
COMMENT ON COLUMN public.students.next_payment_date IS 'Calculated next payment due date';
COMMENT ON COLUMN public.students.next_payment_amount IS 'Calculated next payment amount due';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_students_user_id ON public.students(user_id);
CREATE INDEX idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX idx_students_course_id ON public.students(course_id);
CREATE INDEX idx_students_level ON public.students(level);
CREATE INDEX idx_students_next_payment_date ON public.students(next_payment_date);

-- Unique constraint to ensure one student record per user
CREATE UNIQUE INDEX idx_students_user_id_unique ON public.students(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Users can view students from their school, students can view their own record
CREATE POLICY "School users can view students" 
ON public.students FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    ) OR
    user_id = auth.uid()
);

-- Admins and teachers can create students
CREATE POLICY "Admins and teachers can create students" 
ON public.students FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = students.school_id
    )
);

-- Admins and teachers can update students, students can update their own record
CREATE POLICY "Users can update students" 
ON public.students FOR UPDATE 
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = students.school_id
    )
);

-- Only admins can delete students
CREATE POLICY "Admins can delete students" 
ON public.students FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = students.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION update_students_updated_at();
