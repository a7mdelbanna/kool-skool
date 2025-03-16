
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
    
    // Generate a test course
    const courseName = `Test Course ${new Date().toISOString().substring(0, 10)}`;
    const lessonType = Math.random() > 0.5 ? 'Individual' : 'Group';
    
    console.log(`Creating test course with name: ${courseName}, type: ${lessonType} for school: ${school_id}`)
    
    // Call the RPC function to create the course
    const { data, error } = await supabaseClient.rpc('create_course', {
      school_id,
      course_name: courseName,
      lesson_type: lessonType
    })
    
    if (error) {
      console.error("Error creating test course:", error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Return the created course data
    return new Response(
      JSON.stringify(data),
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
