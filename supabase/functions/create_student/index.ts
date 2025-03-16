
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
    
    // Create the user for the student
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: student_email,
      password: student_password,
      email_confirm: true
    })
    
    if (authError) {
      console.error("Error creating student auth:", authError)
      return new Response(
        JSON.stringify({ success: false, message: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    const studentUserId = authData.user.id
    
    // Insert into users table
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .insert([
        {
          id: studentUserId,
          first_name,
          last_name,
          email: student_email,
          password_hash: 'managed_by_auth', // Not storing actual password
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
