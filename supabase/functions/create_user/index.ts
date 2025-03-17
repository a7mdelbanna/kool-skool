
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-school-id, x-user-role',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }
  
  try {
    // Extract auth information from headers
    const userId = req.headers.get('x-user-id');
    const schoolId = req.headers.get('x-school-id');
    const userRole = req.headers.get('x-user-role');
    
    console.log("Auth headers received:", { userId, schoolId, userRole });
    
    // Verify admin permissions
    if (!userId || !schoolId || userRole !== 'admin') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Only school admins can create users" 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }
    
    // Get request body
    const requestData = await req.json();
    console.log("Request data:", requestData);
    
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      role, 
      school_id 
    } = requestData;
    
    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role || !school_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields" 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Initialize Supabase client with the service role key
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error" 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check valid roles in the database
    const { data: roleConstraintData, error: roleConstraintError } = await supabase.rpc(
      'get_role_constraint_values'
    );
    
    if (roleConstraintError) {
      console.error("Error fetching role constraints:", roleConstraintError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error fetching role constraints" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log("Role constraint data:", roleConstraintData);
    
    // Extract valid roles from constraint definition
    // Example format: CHECK ((role = ANY (ARRAY['admin'::text, 'teacher'::text, 'staff'::text])))
    const roleMatch = roleConstraintData.match(/ARRAY\[(.*?)\]/);
    let validRoles = [];
    
    if (roleMatch && roleMatch[1]) {
      validRoles = roleMatch[1].split(', ').map(role => 
        role.replace(/'/g, '').replace(/::text/g, '')
      );
    }
    
    console.log("Valid roles:", validRoles);
    
    // Check if requested role is valid
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `'${role}' is not a valid role in the database. Valid roles: ${validRoles.join(', ')}` 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Create user directly in the database
    const { data: hashResult, error: hashError } = await supabase.rpc(
      'hash_password',
      { password }
    );
    
    if (hashError || !hashResult) {
      console.error("Error hashing password:", hashError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error hashing password: " + hashError?.message || "Unknown error" 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashResult,
        first_name,
        last_name,
        role,
        school_id,
        created_by: userId
      })
      .select('id')
      .single();
    
    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: userError.message 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    console.log("User created successfully:", userData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        user_id: userData.id
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Unexpected error: " + error.message 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
