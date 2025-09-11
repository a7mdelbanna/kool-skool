-- =====================================================
-- STUDENT PORTAL RPC FUNCTIONS
-- =====================================================
-- Purpose: RPC functions for student portal features
-- =====================================================

-- 1. Request Session Cancellation
CREATE OR REPLACE FUNCTION request_session_cancellation(
    p_session_id UUID,
    p_reason TEXT,
    p_request_type TEXT DEFAULT 'cancel',
    p_requested_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_school_id UUID;
    v_session_date TIMESTAMP WITH TIME ZONE;
    v_hours_before INTEGER;
    v_notice_hours INTEGER;
    v_within_notice BOOLEAN;
    v_request_id UUID;
    v_status TEXT;
BEGIN
    -- Get student ID from auth
    SELECT id INTO v_student_id
    FROM students
    WHERE user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Get session details
    SELECT ls.scheduled_date, s.school_id
    INTO v_session_date, v_school_id
    FROM lesson_sessions ls
    JOIN students s ON s.id = ls.student_id
    WHERE ls.id = p_session_id
    AND ls.student_id = v_student_id
    AND ls.status = 'scheduled';
    
    IF v_session_date IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Session not found or not scheduled'
        );
    END IF;
    
    -- Calculate hours before session
    v_hours_before := EXTRACT(EPOCH FROM (v_session_date - NOW())) / 3600;
    
    -- Get school's cancellation notice requirement
    SELECT (settings->>'cancellation_notice_hours')::INTEGER
    INTO v_notice_hours
    FROM schools
    WHERE id = v_school_id;
    
    IF v_notice_hours IS NULL THEN
        v_notice_hours := 24; -- Default to 24 hours
    END IF;
    
    -- Check if within notice period
    v_within_notice := v_hours_before >= v_notice_hours;
    
    -- Determine status
    IF v_within_notice THEN
        v_status := 'auto_approved';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Create cancellation request
    INSERT INTO cancellation_requests (
        session_id,
        student_id,
        school_id,
        reason,
        request_type,
        requested_date,
        status,
        hours_before_session,
        within_notice_period,
        counts_as_completed
    ) VALUES (
        p_session_id,
        v_student_id,
        v_school_id,
        p_reason,
        p_request_type,
        p_requested_date,
        v_status,
        v_hours_before,
        v_within_notice,
        NOT v_within_notice -- Counts as completed if outside notice period
    ) RETURNING id INTO v_request_id;
    
    -- If auto-approved and within notice, update session status
    IF v_status = 'auto_approved' AND p_request_type = 'cancel' THEN
        UPDATE lesson_sessions
        SET status = 'cancelled',
            notes = COALESCE(notes || E'\n', '') || 'Student cancellation (auto-approved): ' || p_reason
        WHERE id = p_session_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'request_id', v_request_id,
        'status', v_status,
        'within_notice_period', v_within_notice,
        'message', CASE 
            WHEN v_status = 'auto_approved' THEN 'Cancellation approved automatically'
            ELSE 'Cancellation request submitted for review'
        END
    );
END;
$$;

-- 2. Update Student Profile
CREATE OR REPLACE FUNCTION update_student_profile(
    p_profile_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Get student ID from auth
    SELECT id INTO v_student_id
    FROM students
    WHERE user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Update profile data
    UPDATE students
    SET profile_data = profile_data || p_profile_data,
        updated_at = NOW()
    WHERE id = v_student_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Update user table fields if provided
    IF p_profile_data ? 'email' THEN
        UPDATE users
        SET email = p_profile_data->>'email'
        WHERE id = auth.uid();
    END IF;
    
    IF p_profile_data ? 'phone' THEN
        UPDATE students
        SET phone = p_profile_data->>'phone'
        WHERE id = v_student_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Profile updated successfully',
        'updated_fields', array_length(array(SELECT jsonb_object_keys(p_profile_data)), 1)
    );
END;
$$;

-- 3. Complete Student Onboarding
CREATE OR REPLACE FUNCTION complete_student_onboarding()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    -- Get student ID from auth
    SELECT id INTO v_student_id
    FROM students
    WHERE user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Mark onboarding as completed
    UPDATE students
    SET onboarding_completed = true,
        onboarding_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_student_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Onboarding completed successfully'
    );
END;
$$;

-- 4. Get Student Analytics
CREATE OR REPLACE FUNCTION get_student_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_total_sessions INTEGER;
    v_completed_sessions INTEGER;
    v_cancelled_sessions INTEGER;
    v_attendance_rate NUMERIC;
    v_total_hours NUMERIC;
    v_upcoming_sessions INTEGER;
    v_achievements_count INTEGER;
    v_resources_accessed INTEGER;
BEGIN
    -- Get student ID from auth
    SELECT id INTO v_student_id
    FROM students
    WHERE user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Calculate session statistics
    SELECT 
        COUNT(*) FILTER (WHERE status != 'scheduled' OR scheduled_date < NOW()),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_date >= NOW()),
        COALESCE(SUM(duration_minutes) FILTER (WHERE status = 'completed'), 0) / 60.0
    INTO 
        v_total_sessions,
        v_completed_sessions,
        v_cancelled_sessions,
        v_upcoming_sessions,
        v_total_hours
    FROM lesson_sessions
    WHERE student_id = v_student_id;
    
    -- Calculate attendance rate
    IF v_total_sessions > 0 THEN
        v_attendance_rate := (v_completed_sessions::NUMERIC / v_total_sessions) * 100;
    ELSE
        v_attendance_rate := 0;
    END IF;
    
    -- Count achievements
    SELECT COUNT(*)
    INTO v_achievements_count
    FROM student_achievements
    WHERE student_id = v_student_id
    AND is_completed = true;
    
    RETURN json_build_object(
        'success', true,
        'analytics', json_build_object(
            'sessions', json_build_object(
                'total', v_total_sessions,
                'completed', v_completed_sessions,
                'cancelled', v_cancelled_sessions,
                'upcoming', v_upcoming_sessions
            ),
            'attendance_rate', ROUND(v_attendance_rate, 1),
            'total_hours', ROUND(v_total_hours, 1),
            'achievements_earned', v_achievements_count,
            'current_streak', 0, -- Can be calculated based on consecutive attendance
            'improvement_trend', 0 -- Can be calculated based on grades/feedback
        )
    );
END;
$$;

-- 5. Submit Payment Proof
CREATE OR REPLACE FUNCTION submit_payment_proof(
    p_amount NUMERIC,
    p_currency TEXT,
    p_payment_method TEXT,
    p_proof_urls TEXT[],
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_subscription_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_school_id UUID;
    v_submission_id UUID;
BEGIN
    -- Get student ID from auth
    SELECT s.id, s.school_id 
    INTO v_student_id, v_school_id
    FROM students s
    WHERE s.user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Create payment submission
    INSERT INTO payment_submissions (
        student_id,
        school_id,
        subscription_id,
        amount,
        currency,
        payment_method,
        reference_number,
        proof_urls,
        submission_notes,
        status
    ) VALUES (
        v_student_id,
        v_school_id,
        p_subscription_id,
        p_amount,
        p_currency,
        p_payment_method,
        p_reference_number,
        p_proof_urls,
        p_notes,
        'pending'
    ) RETURNING id INTO v_submission_id;
    
    RETURN json_build_object(
        'success', true,
        'submission_id', v_submission_id,
        'message', 'Payment proof submitted successfully. Awaiting review.'
    );
END;
$$;

-- 6. Get Available Resources
CREATE OR REPLACE FUNCTION get_student_resources()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_course_id UUID;
    v_resources JSON;
BEGIN
    -- Get student ID and course from auth
    SELECT s.id, s.course_id 
    INTO v_student_id, v_course_id
    FROM students s
    WHERE s.user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Get available resources
    SELECT json_agg(
        json_build_object(
            'id', sr.id,
            'title', sr.title,
            'description', sr.description,
            'type', sr.resource_type,
            'url', COALESCE(sr.file_url, sr.external_link),
            'category', sr.category,
            'tags', sr.tags
        ) ORDER BY sr.order_index, sr.created_at DESC
    ) INTO v_resources
    FROM student_resources sr
    WHERE sr.is_active = true
    AND (
        sr.available_to_all = true 
        OR v_student_id = ANY(sr.specific_student_ids)
        OR (sr.course_id = v_course_id AND sr.course_id IS NOT NULL)
    );
    
    RETURN json_build_object(
        'success', true,
        'resources', COALESCE(v_resources, '[]'::JSON)
    );
END;
$$;

-- 7. Add Session to Calendar (returns calendar event data)
CREATE OR REPLACE FUNCTION get_session_calendar_event(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_event_data JSON;
BEGIN
    -- Get student ID from auth
    SELECT id INTO v_student_id
    FROM students
    WHERE user_id = auth.uid();
    
    IF v_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- Get session details for calendar event
    SELECT json_build_object(
        'title', c.name || ' Lesson',
        'start', ls.scheduled_date,
        'end', ls.scheduled_date + (ls.duration_minutes || ' minutes')::INTERVAL,
        'description', 'Teacher: ' || u.first_name || ' ' || u.last_name || 
                      CASE WHEN ls.notes IS NOT NULL THEN E'\n\nNotes: ' || ls.notes ELSE '' END,
        'location', 'Online', -- Can be enhanced with actual location
        'status', ls.status
    ) INTO v_event_data
    FROM lesson_sessions ls
    JOIN students s ON s.id = ls.student_id
    JOIN courses c ON c.id = s.course_id
    LEFT JOIN users u ON u.id = s.teacher_id
    WHERE ls.id = p_session_id
    AND ls.student_id = v_student_id;
    
    IF v_event_data IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Session not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'event', v_event_data
    );
END;
$$;

-- 8. Get School Settings (for student portal)
CREATE OR REPLACE FUNCTION get_school_settings_for_student()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id UUID;
    v_settings JSONB;
BEGIN
    -- Get school ID from student
    SELECT s.school_id INTO v_school_id
    FROM students s
    WHERE s.user_id = auth.uid();
    
    IF v_school_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student school not found'
        );
    END IF;
    
    -- Get relevant settings for students
    SELECT json_build_object(
        'cancellation_notice_hours', settings->'cancellation_notice_hours',
        'allow_student_cancellation', settings->'allow_student_cancellation',
        'allow_payment_upload', settings->'allow_payment_upload',
        'enable_google_calendar', settings->'enable_google_calendar',
        'payment_methods', settings->'payment_methods',
        'student_permissions', settings->'student_permissions'
    ) INTO v_settings
    FROM schools
    WHERE id = v_school_id;
    
    RETURN json_build_object(
        'success', true,
        'settings', v_settings
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION request_session_cancellation TO authenticated;
GRANT EXECUTE ON FUNCTION update_student_profile TO authenticated;
GRANT EXECUTE ON FUNCTION complete_student_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION submit_payment_proof TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_resources TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_calendar_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_settings_for_student TO authenticated;