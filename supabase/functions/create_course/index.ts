
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
    
    if (!userId || !schoolId) {
      console.error("Missing required headers:", { userId, schoolId });
      return new Response(
        JSON.stringify({ 
          error: "Missing required headers",
          detail: "x-user-id and x-school-id headers are required"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Get request body and create a copy to log (to avoid consuming the body)
    const requestText = await req.text();
    console.log("Raw request body:", requestText);
    
    // Parse the raw body into JSON with error handling
    let requestData;
    try {
      if (!requestText || requestText.trim() === '') {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      requestData = JSON.parse(requestText);
      console.log("Parsed request data:", requestData);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body", 
          detail: parseError.message 
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
    const { school_id, course_name, lesson_type } = requestData;
    
    console.log(`Creating course with name: ${course_name}, type: ${lesson_type} for school: ${school_id}`);
    
    // Validate request data
    if (!school_id || !course_name || !lesson_type) {
      console.error("Missing required fields in request body:", {
        hasSchoolId: !!school_id,
        hasCourseName: !!course_name,
        hasLessonType: !!lesson_type
      });
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
    
    // Insert directly into courses table
    const { data, error } = await supabaseClient
      .from('courses')
      .insert({
        school_id,
        name: course_name,
        lesson_type
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating course:", error);
      return new Response(
        JSON.stringify({ error: error.message, detail: error.details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log("Course created successfully:", data);
    
    // Return the created course data
    return new Response(
      JSON.stringify({
        id: data.id,
        school_id: data.school_id,
        name: data.name,
        lesson_type: data.lesson_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
