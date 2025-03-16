
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-school-id, x-user-role',
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
          error: "No API key found in request",
          detail: "No 'apikey' request header or url param was found."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }
    
    // Get request headers for validation
    const userId = req.headers.get('x-user-id')
    const schoolId = req.headers.get('x-school-id')
    const userRole = req.headers.get('x-user-role')
    
    console.log("Received headers:", { 
      userId, 
      schoolId, 
      userRole,
      hasApiKey: !!apiKey
    })
    
    // Get request body and content type
    const contentType = req.headers.get('content-type') || '';
    console.log("Content type:", contentType);
    
    // Parse request body with extensive error handling
    let requestData;
    try {
      // Read the request body as text to log it first
      const text = await req.text();
      console.log("Raw request body:", text);
      
      if (!text || text.trim() === '') {
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Parse the text into JSON
      try {
        requestData = JSON.parse(text);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return new Response(
          JSON.stringify({ 
            error: "Invalid JSON in request body", 
            detail: parseError.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      console.log("Parsed request data:", requestData);
    } catch (bodyError) {
      console.error("Error reading request body:", bodyError);
      return new Response(
        JSON.stringify({ 
          error: "Error reading request body", 
          detail: bodyError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
        },
        global: {
          headers: {
            apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          }
        }
      }
    )
    
    // Extract data from request body
    const { school_id, course_name, lesson_type } = requestData
    
    console.log(`Creating course with name: ${course_name}, type: ${lesson_type} for school: ${school_id}`)
    
    // Validate request data
    if (!school_id || !course_name || !lesson_type) {
      console.error("Missing required fields in request body");
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          detail: {
            hasSchoolId: !!school_id,
            hasCourseName: !!course_name,
            hasLessonType: !!lesson_type
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Call the RPC function to create the course
    const { data, error } = await supabaseClient.rpc('create_course', {
      school_id,
      course_name,
      lesson_type
    })
    
    if (error) {
      console.error("Error creating course:", error);
      return new Response(
        JSON.stringify({ error: error.message, detail: error.details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Return the created course data
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Unhandled error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
