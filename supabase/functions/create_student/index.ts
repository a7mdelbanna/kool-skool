
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
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Verify API key is present
    const apiKey = req.headers.get('apikey') || req.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!apiKey) {
      console.error("No API key found in request headers");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No API key found in request",
          hint: "No 'apikey' request header or url param was found."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }
    
    // Get request headers for admin validation
    const userId = req.headers.get('x-user-id')
    const schoolId = req.headers.get('x-school-id')
    const userRole = req.headers.get('x-user-role')
    
    console.log("Received headers:", { 
      userId, 
      schoolId, 
      userRole,
      hasApiKey: !!apiKey
    })
    
    // Validate admin role
    if (!userId || !schoolId || userRole !== 'admin') {
      console.error("Admin validation failed:", { userId, schoolId, userRole })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Only school admins can create students",
          detail: { userId, schoolId, userRole }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )
    
    // Get request body - Create a copy of the request to avoid consuming it
    const clonedRequest = req.clone();
    const rawBody = await clonedRequest.text();
    console.log("Raw request body:", rawBody);
    
    // Parse the raw body into JSON with error handling
    let requestData;
    try {
      if (!rawBody || rawBody.trim() === '') {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ success: false, message: "Empty request body" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      requestData = JSON.parse(rawBody);
      console.log("Parsed request data:", requestData);
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
    
    // Verify all required fields are present
    const requiredFields = {
      'email': student_email,
      'password': student_password,
      'first_name': first_name,
      'last_name': last_name,
      'teacher_id': teacher_id,
      'course_id': course_id,
      'age_group': age_group,
      'level': level,
      'school_id': schoolId
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Missing required fields for student creation: ${missingFields.join(', ')}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Verify the teacher belongs to the same school
    const { data: teacherData, error: teacherError } = await supabaseClient
      .from('users')
      .select('school_id, role')
      .eq('id', teacher_id)
      .single()
    
    if (teacherError || !teacherData) {
      console.error("Teacher not found:", { teacherError });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Teacher not found" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    if (teacherData.school_id !== schoolId) {
      console.error("Teacher not from same school:", { 
        teacherSchoolId: teacherData.school_id, 
        requestSchoolId: schoolId 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Teacher not associated with this school" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    if (teacherData.role !== 'teacher') {
      console.error("Selected user is not a teacher:", { 
        selectedUserRole: teacherData.role 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Selected user is not a teacher"
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
    
    if (courseError || !courseData) {
      console.error("Course not found:", { courseError });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Course not found" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    if (courseData.school_id !== schoolId) {
      console.error("Course not from same school:", { 
        courseSchoolId: courseData.school_id, 
        requestSchoolId: schoolId 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Course not associated with this school" 
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
    
    // Hash the password
    const { data: hashResult, error: hashError } = await supabaseClient.rpc(
      'hash_password',
      { password: student_password }
    );
    
    if (hashError || !hashResult) {
      console.error("Error hashing password:", hashError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error hashing password: " + (hashError?.message || "Unknown error")
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Directly get the check constraint definition for the role column 
    // This will tell us the exact values allowed by the constraint
    const { data: constraintData, error: constraintError } = await supabaseClient.rpc(
      'get_role_constraint_values'
    );
    
    if (constraintError) {
      console.error("Error getting role constraint values:", constraintError);
      
      // Fallback to hardcoded value if we can't get the constraint
      console.log("Using hardcoded role value: 'Student'");
      
      // Since there is an error getting the constraint, try 'Student' with capital S
      const roleValue = 'Student';
      
      // Insert into users table first with properly hashed password and best-guess role value
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .insert([
          {
            first_name,
            last_name,
            email: student_email,
            password_hash: hashResult,
            role: roleValue,
            school_id: schoolId,
            created_by: userId
          }
        ])
        .select('id')
        .single()
      
      if (userError) {
        console.error("Error creating user record with 'Student':", userError);
        
        // If that failed, try 'student' with lowercase s
        console.log("Trying alternate role value: 'student'");
        
        const { data: userData2, error: userError2 } = await supabaseClient
          .from('users')
          .insert([
            {
              first_name,
              last_name,
              email: student_email,
              password_hash: hashResult,
              role: 'student',
              school_id: schoolId,
              created_by: userId
            }
          ])
          .select('id')
          .single()
        
        if (userError2) {
          console.error("Error creating user record with 'student':", userError2);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Failed to create user with any known role value. Error: " + userError2.message,
              detail: userError2.details || userError2.hint
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        
        // If second attempt succeeded, use that user ID
        return await createStudentRecord(supabaseClient, userData2.id, schoolId, teacher_id, course_id, age_group, level, phone, corsHeaders);
      }
      
      // If first attempt succeeded, use that user ID
      return await createStudentRecord(supabaseClient, userData.id, schoolId, teacher_id, course_id, age_group, level, phone, corsHeaders);
    }
    
    console.log("Retrieved role constraint values:", constraintData);
    
    // Parse the constraint values (usually in format like: 'admin', 'teacher', 'student')
    let validRoles = [];
    if (constraintData && typeof constraintData === 'string') {
      // Extract values from format like: 'CHECK (role::text = ANY (ARRAY['admin'::text, 'teacher'::text, 'student'::text]))'
      const match = constraintData.match(/ARRAY\[(.*?)\]/);
      if (match && match[1]) {
        validRoles = match[1].split(',').map(role => {
          // Clean up quotes and ::text
          return role.trim().replace(/['"]|::text/g, '');
        });
      }
    }
    
    console.log("Valid roles parsed from constraint:", validRoles);
    
    // Find the correct case for "student" in the valid roles
    let studentRole = 'student'; // Default
    for (const role of validRoles) {
      if (role.toLowerCase() === 'student') {
        studentRole = role;
        break;
      }
    }
    
    console.log("Using role value:", studentRole);
    
    // Insert into users table with the correct role case
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .insert([
        {
          first_name,
          last_name,
          email: student_email,
          password_hash: hashResult,
          role: studentRole,  // Use the role with proper casing
          school_id: schoolId,
          created_by: userId
        }
      ])
      .select('id')
      .single()
    
    if (userError) {
      console.error("Error creating user record:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: userError.message,
          detail: userError.details || userError.hint
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    return await createStudentRecord(supabaseClient, userData.id, schoolId, teacher_id, course_id, age_group, level, phone, corsHeaders);
    
  } catch (error) {
    console.error("Unhandled error:", error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function to create student record after creating user
async function createStudentRecord(supabaseClient, studentUserId, schoolId, teacher_id, course_id, age_group, level, phone, corsHeaders) {
  try {
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
      console.error("Error creating student record:", studentError);
      // Attempt to clean up the user record since student creation failed
      try {
        await supabaseClient.from('users').delete().eq('id', studentUserId);
      } catch (cleanupError) {
        console.error("Failed to clean up user after student creation error:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: studentError.message,
          detail: studentError.details || studentError.hint 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log("Student created successfully:", { 
      userId: studentUserId, 
      studentId: studentData.id 
    });
    
    // Return success response with explicit student_id field
    return new Response(
      JSON.stringify({
        success: true,
        user_id: studentUserId,
        student_id: studentData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Error in createStudentRecord:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}
