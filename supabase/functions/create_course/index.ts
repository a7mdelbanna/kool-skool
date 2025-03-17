
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-school-id, x-user-role',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    console.log("Create course function called with method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Get request headers for validation
    const userId = req.headers.get('x-user-id')
    const schoolId = req.headers.get('x-school-id')
    const userRole = req.headers.get('x-user-role')
    
    console.log("Extracted headers:", { userId, schoolId, userRole });
    
    if (!userId || !schoolId) {
      console.error("Missing required headers");
      return new Response(
        JSON.stringify({ 
          error: "Missing required headers",
          detail: "x-user-id and x-school-id headers are required"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Get request body as text
    let requestBody;
    try {
      const requestText = await req.text();
      console.log("Raw request body:", requestText);
      
      if (!requestText || requestText.trim() === '') {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      requestBody = JSON.parse(requestText);
      console.log("Parsed request data:", requestBody);
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error", 
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
    
    // Extract data from request body with fallbacks
    const { school_id, course_name, lesson_type } = requestBody;
    
    // Use schoolId from header as fallback if not in request body
    const finalSchoolId = school_id || schoolId;
    
    console.log(`Creating course with name: ${course_name}, type: ${lesson_type} for school: ${finalSchoolId}`);
    
    // Validate required fields
    if (!finalSchoolId || !course_name || !lesson_type) {
      console.error("Missing required fields:", {
        hasSchoolId: !!finalSchoolId,
        hasCourseName: !!course_name,
        hasLessonType: !!lesson_type
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          detail: {
            school_id: !!finalSchoolId,
            course_name: !!course_name,
            lesson_type: !!lesson_type
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Insert course record directly into the database
    const { data, error } = await supabaseClient
      .from('courses')
      .insert({
        school_id: finalSchoolId,
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
