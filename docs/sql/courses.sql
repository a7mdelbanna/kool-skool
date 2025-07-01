
-- =====================================================
-- COURSES TABLE
-- =====================================================
-- Purpose: Store course/subject information offered by schools
-- Courses define what subjects are taught (Math, English, etc.)
-- =====================================================

CREATE TABLE public.courses (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Course information
    name TEXT NOT NULL,
    lesson_type TEXT NOT NULL CHECK (lesson_type IN ('individual', 'group')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.courses IS 'Courses and subjects offered by schools';
COMMENT ON COLUMN public.courses.id IS 'Unique identifier for each course';
COMMENT ON COLUMN public.courses.school_id IS 'Reference to the school offering this course';
COMMENT ON COLUMN public.courses.name IS 'Course name (e.g., Mathematics, English, Piano)';
COMMENT ON COLUMN public.courses.lesson_type IS 'Type of lessons: individual (1-on-1) or group classes';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_courses_school_id ON public.courses(school_id);
CREATE INDEX idx_courses_lesson_type ON public.courses(lesson_type);
CREATE INDEX idx_courses_name ON public.courses(name);

-- Unique constraint to prevent duplicate course names per school
CREATE UNIQUE INDEX idx_courses_school_name_unique ON public.courses(school_id, name);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Users can view courses from their school
CREATE POLICY "School users can view courses" 
ON public.courses FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Admins and teachers can create courses
CREATE POLICY "Admins and teachers can create courses" 
ON public.courses FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = courses.school_id
    )
);

-- Admins and teachers can update courses
CREATE POLICY "Admins and teachers can update courses" 
ON public.courses FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher')
        AND school_id = courses.school_id
    )
);

-- Only admins can delete courses
CREATE POLICY "Admins can delete courses" 
ON public.courses FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = courses.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
