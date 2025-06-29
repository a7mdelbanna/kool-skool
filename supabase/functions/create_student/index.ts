import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-school-id, x-user-role',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log("Create student function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders, status: 204 })
  }
  
  try {
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Get request headers for validation
    const userId = req.headers.get('x-user-id')
    const schoolId = req.headers.get('x-school-id')
    const userRole = req.headers.get('x-user-role')
    
    console.log("Received headers:", { 
      userId, 
      schoolId, 
      userRole
    })
    
    // Allow both admin and teacher roles to create students
    if (!userId || !schoolId || !['admin', 'teacher'].includes(userRole || '')) {
      console.error("Role validation failed:", { userId, schoolId, userRole })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Only school admins and teachers can create students",
          detail: { userId, schoolId, userRole }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error", 
          detail: "Supabase URL or service key is missing" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`
          }
        }
      }
    )
    
    // Get and parse request body
    let requestBody;
    try {
      const requestText = await req.text();
      console.log("Raw request body:", requestText);
      
      if (!requestText || requestText.trim() === '') {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ success: false, message: "Empty request body" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      requestBody = JSON.parse(requestText);
      console.log("Parsed request data:", requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid JSON in request body", 
          detail: parseError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Extract data from the request body
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
    } = requestBody;
    
    console.log(`Creating student ${first_name} ${last_name} for school: ${schoolId}`)
    
    // Verify all required fields are present
    if (!student_email || !student_password || !first_name || !last_name || !teacher_id || !course_id || !age_group || !level) {
      console.error("Missing required fields:", { 
        hasEmail: !!student_email, 
        hasPassword: !!student_password,
        hasFirstName: !!first_name,
        hasLastName: !!last_name,
        hasTeacherId: !!teacher_id,
        hasCourseId: !!course_id,
        hasAgeGroup: !!age_group,
        hasLevel: !!level
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields for student creation" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Use the database function to create the student
    console.log("Calling create_student database function");
    const { data: result, error: createError } = await supabaseClient.rpc(
      'create_student',
      {
        student_email,
        student_password,
        student_first_name: first_name,
        student_last_name: last_name,
        teacher_id,
        course_id,
        age_group,
        level,
        phone,
        current_user_id: userId
      }
    );
    
    if (createError) {
      console.error("Error calling create_student function:", createError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: createError.message || "Failed to create student"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log("Create student function result:", result);
    
    if (!result || !result.success) {
      console.error("Student creation failed:", result?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: result?.message || "Failed to create student"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log("Student created successfully:", { 
      userId: result.user_id, 
      studentId: result.student_id 
    });
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user_id: result.user_id,
        student_id: result.student_id
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
