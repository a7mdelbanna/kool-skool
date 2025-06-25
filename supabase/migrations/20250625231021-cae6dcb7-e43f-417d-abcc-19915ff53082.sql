
-- Create the basic tables for the school management system

-- Users table (extends Supabase auth)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'staff')),
  school_id UUID,
  phone TEXT,
  password_hash TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Licenses table
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  duration_days INTEGER DEFAULT 365,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info JSONB,
  logo TEXT,
  license_id UUID REFERENCES public.licenses(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for school_id in users table
ALTER TABLE public.users ADD CONSTRAINT users_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- Courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  name TEXT NOT NULL,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('individual', 'group')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  teacher_id UUID REFERENCES public.users(id),
  course_id UUID REFERENCES public.courses(id),
  age_group TEXT CHECK (age_group IN ('Adult', 'Kid')),
  level TEXT CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid recursive RLS issues
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for users table
CREATE POLICY "Users can view users in their school" ON public.users
  FOR SELECT USING (
    school_id = public.get_current_user_school_id()
  );

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    public.get_current_user_role() = 'admin' AND school_id = public.get_current_user_school_id()
  );

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- RLS Policies for schools table
CREATE POLICY "Users can view their school" ON public.schools
  FOR SELECT USING (
    id = public.get_current_user_school_id()
  );

-- RLS Policies for courses table
CREATE POLICY "Users can view courses in their school" ON public.courses
  FOR SELECT USING (
    school_id = public.get_current_user_school_id()
  );

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (
    public.get_current_user_role() = 'admin' AND school_id = public.get_current_user_school_id()
  );

-- RLS Policies for students table
CREATE POLICY "Users can view students in their school" ON public.students
  FOR SELECT USING (
    school_id = public.get_current_user_school_id()
  );

CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING (
    public.get_current_user_role() = 'admin' AND school_id = public.get_current_user_school_id()
  );

-- Create helper functions
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple hash for demo - in production use proper bcrypt
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_role_constraint_values()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CHECK ((role = ANY (ARRAY[''admin''::text, ''teacher''::text, ''student''::text, ''staff''::text])))';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User login function
CREATE OR REPLACE FUNCTION public.user_login(user_email TEXT, user_password TEXT)
RETURNS JSON AS $$
DECLARE
  user_record public.users;
  hashed_password TEXT;
BEGIN
  hashed_password := public.hash_password(user_password);
  
  SELECT * INTO user_record FROM public.users 
  WHERE email = user_email AND password_hash = hashed_password 
  LIMIT 1;
  
  IF user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid email or password'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', user_record.id,
    'first_name', user_record.first_name,
    'last_name', user_record.last_name,
    'role', user_record.role,
    'school_id', user_record.school_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- School setup function
CREATE OR REPLACE FUNCTION public.verify_license_and_create_school(
  license_key TEXT,
  school_name TEXT,
  admin_first_name TEXT,
  admin_last_name TEXT,
  admin_email TEXT,
  admin_password TEXT
)
RETURNS JSON AS $$
DECLARE
  license_record public.licenses;
  school_id UUID;
  user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Check if license exists and is valid
  SELECT * INTO license_record FROM public.licenses 
  WHERE license_key = verify_license_and_create_school.license_key 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  IF license_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired license key'
    );
  END IF;
  
  -- Create school
  INSERT INTO public.schools (name, license_id)
  VALUES (school_name, license_record.id)
  RETURNING id INTO school_id;
  
  -- Hash password
  hashed_password := public.hash_password(admin_password);
  
  -- Create admin user
  INSERT INTO public.users (email, first_name, last_name, role, school_id, password_hash)
  VALUES (admin_email, admin_first_name, admin_last_name, 'admin', school_id, hashed_password)
  RETURNING id INTO user_id;
  
  RETURN json_build_object(
    'success', true,
    'school_id', school_id,
    'user_id', user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add team member function
CREATE OR REPLACE FUNCTION public.add_team_member(
  member_first_name TEXT,
  member_last_name TEXT,
  member_email TEXT,
  member_role TEXT,
  member_password TEXT
)
RETURNS JSON AS $$
DECLARE
  current_user_record public.users;
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Get current user info
  SELECT * INTO current_user_record FROM public.users WHERE id = auth.uid();
  
  IF current_user_record.role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can add team members'
    );
  END IF;
  
  -- Hash password
  hashed_password := public.hash_password(member_password);
  
  -- Create new user
  INSERT INTO public.users (email, first_name, last_name, role, school_id, password_hash, created_by)
  VALUES (member_email, member_first_name, member_last_name, member_role, current_user_record.school_id, hashed_password, auth.uid())
  RETURNING id INTO new_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create student function
CREATE OR REPLACE FUNCTION public.create_student(
  student_email TEXT,
  student_password TEXT,
  student_first_name TEXT,
  student_last_name TEXT,
  teacher_id UUID,
  course_id UUID,
  age_group TEXT,
  level TEXT,
  phone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_user_record public.users;
  student_user_id UUID;
  student_id UUID;
  hashed_password TEXT;
BEGIN
  -- Get current user info
  SELECT * INTO current_user_record FROM public.users WHERE id = auth.uid();
  
  IF current_user_record.role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can create students'
    );
  END IF;
  
  -- Hash password
  hashed_password := public.hash_password(student_password);
  
  -- Create user record for student
  INSERT INTO public.users (email, first_name, last_name, role, school_id, phone, password_hash, created_by)
  VALUES (student_email, student_first_name, student_last_name, 'student', current_user_record.school_id, phone, hashed_password, auth.uid())
  RETURNING id INTO student_user_id;
  
  -- Create student record
  INSERT INTO public.students (school_id, user_id, teacher_id, course_id, age_group, level, phone)
  VALUES (current_user_record.school_id, student_user_id, teacher_id, course_id, age_group, level, phone)
  RETURNING id INTO student_id;
  
  RETURN json_build_object(
    'success', true,
    'student_id', student_id,
    'user_id', student_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get students with details function
CREATE OR REPLACE FUNCTION public.get_students_with_details(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  user_id UUID,
  teacher_id UUID,
  course_id UUID,
  age_group TEXT,
  level TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  course_name TEXT,
  lesson_type TEXT,
  teacher_first_name TEXT,
  teacher_last_name TEXT,
  teacher_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.school_id,
    s.user_id,
    s.teacher_id,
    s.course_id,
    s.age_group,
    s.level,
    s.phone,
    s.created_at,
    u.first_name,
    u.last_name,
    u.email,
    c.name as course_name,
    c.lesson_type,
    t.first_name as teacher_first_name,
    t.last_name as teacher_last_name,
    t.email as teacher_email
  FROM public.students s
  LEFT JOIN public.users u ON s.user_id = u.id
  LEFT JOIN public.courses c ON s.course_id = c.id
  LEFT JOIN public.users t ON s.teacher_id = t.id
  WHERE s.school_id = p_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample license for testing
INSERT INTO public.licenses (license_key, expires_at, duration_days, is_active)
VALUES ('DEMO-LICENSE-2025', '2025-12-31 23:59:59', 365, true);
