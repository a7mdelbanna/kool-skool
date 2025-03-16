
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-school-id, x-user-role',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get request headers for admin validation
    const userId = req.headers.get('x-user-id')
    const schoolId = req.headers.get('x-school-id')
    const userRole = req.headers.get('x-user-role')
    
    console.log("Received headers:", { userId, schoolId, userRole })
    
    // Validate admin role
    if (!userId || !schoolId || userRole !== 'admin') {
      console.error("Admin validation failed:", { userId, schoolId, userRole })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Only school admins can create students" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Verify that the user exists and is an admin
    const { data: adminData, error: adminError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('school_id', schoolId)
      .single()
    
    if (adminError || !adminData || adminData.role !== 'admin') {
      console.error("Admin verification failed:", { adminError, adminData })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Admin verification failed" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Get request body
    const requestData = await req.json()
    const { 
      student_email, 
      student_password,
      first_name,
      last_name,
      teacher_id,
      course_id,
      age_group,
      level,
      phone
    } = requestData
    
    console.log(`Creating student ${first_name} ${last_name} for school: ${schoolId}`)
    
    // Verify the teacher belongs to the same school
    const { data: teacherData, error: teacherError } = await supabaseClient
      .from('users')
      .select('school_id')
      .eq('id', teacher_id)
      .single()
    
    if (teacherError || !teacherData || teacherData.school_id !== schoolId) {
      console.error("Teacher verification failed:", { teacherError, teacherData })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Teacher not found or not associated with this school" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Verify the course belongs to the same school
    const { data: courseData, error: courseError } = await supabaseClient
      .from('courses')
      .select('school_id')
      .eq('id', course_id)
      .single()
    
    if (courseError || !courseData || courseData.school_id !== schoolId) {
      console.error("Course verification failed:", { courseError, courseData })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Course not found or not associated with this school" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // First, check if a user with this email already exists
    const { data: existingUserData, error: existingUserError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', student_email)
      .maybeSingle()
    
    if (existingUserData) {
      console.error("User with this email already exists:", student_email)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "A user with this email already exists" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Insert into users table first
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .insert([
        {
          first_name,
          last_name,
          email: student_email,
          password_hash: student_password, // Use actual password or hash it here
          role: 'student',
          school_id: schoolId,
          created_by: userId
        }
      ])
      .select('id')
      .single()
    
    if (userError) {
      console.error("Error creating user record:", userError)
      return new Response(
        JSON.stringify({ success: false, message: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    const studentUserId = userData.id
    
    // Create student record
    const { data: studentData, error: studentError } = await supabaseClient
      .from('students')
      .insert([
        {
          school_id: schoolId,
          user_id: studentUserId,
          teacher_id,
          course_id,
          age_group,
          level,
          phone
        }
      ])
      .select('id')
      .single()
    
    if (studentError) {
      console.error("Error creating student record:", studentError)
      // Attempt to clean up the user record since student creation failed
      try {
        await supabaseClient.from('users').delete().eq('id', studentUserId)
      } catch (cleanupError) {
        console.error("Failed to clean up user after student creation error:", cleanupError)
      }
      
      return new Response(
        JSON.stringify({ success: false, message: studentError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user_id: studentUserId,
        student_id: studentData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Unhandled error:", error.message)
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
