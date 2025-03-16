
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get request body
    const requestData = await req.json()
    const { school_id } = requestData
    
    if (!school_id) {
      return new Response(
        JSON.stringify({ error: "Missing required school_id parameter" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // First check if there are any existing courses
    console.log(`Checking for existing courses for school: ${school_id}`)
    const { data: existingCourses, error: fetchError } = await supabaseClient
      .from('courses')
      .select('*')
      .eq('school_id', school_id)
    
    if (fetchError) {
      console.error("Error checking existing courses:", fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // If courses already exist, return the first one
    if (existingCourses && existingCourses.length > 0) {
      console.log(`Found existing course: ${existingCourses[0].name}`)
      return new Response(
        JSON.stringify(existingCourses[0]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Generate a test course
    const courseName = `Test Course ${new Date().toISOString().substring(0, 10)}`;
    const lessonType = Math.random() > 0.5 ? 'Individual' : 'Group';
    
    console.log(`Creating test course with name: ${courseName}, type: ${lessonType} for school: ${school_id}`)
    
    // Insert directly into the courses table
    const { data: courseData, error: insertError } = await supabaseClient
      .from('courses')
      .insert([
        { 
          school_id: school_id,
          name: courseName,
          lesson_type: lessonType
        }
      ])
      .select()
      .single()
    
    if (insertError) {
      console.error("Error creating test course:", insertError)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Return the created course data
    return new Response(
      JSON.stringify(courseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
