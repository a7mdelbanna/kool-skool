
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-school-id, x-user-role',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log("Create course function called");
  
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
          message: "No API key found in request"
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
          message: "Only school admins can create courses",
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
    
    // Get request body
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
    
    const { name, lesson_type } = requestData;
    
    // Verify required fields
    if (!name || !lesson_type) {
      console.error("Missing required fields:", { name, lesson_type });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields: name and lesson_type are required" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Call the SQL function to create a course
    const { data, error } = await supabaseClient.rpc(
      'create_course',
      { 
        school_id: schoolId, 
        course_name: name, 
        lesson_type: lesson_type 
      }
    );
    
    if (error) {
      console.error("Error creating course:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to create course", 
          detail: error.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    if (data.error) {
      console.error("Error in create_course function:", data.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Database error creating course", 
          detail: data.error 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log("Course created successfully:", data);
    
    return new Response(
      JSON.stringify({
        success: true,
        course: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error("Unhandled error:", error);
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
