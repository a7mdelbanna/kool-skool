
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://einhiigvmmsbjhpcuosz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbmhpaWd2bW1zYmpocGN1b3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMzY2OTEsImV4cCI6MjA1NzcxMjY5MX0.PUW2kD1r6Zjo3FUsqws_62gR414EtDe60XH1-9k2cFI";

// Interface for Supabase function return types
export interface UserLoginResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  school_id?: string;
}

export interface SchoolSetupResponse {
  success: boolean;
  message?: string;
  school_id?: string;
  user_id?: string;
}

export interface TeamMemberResponse {
  success: boolean;
  message?: string;
  member_id?: string;
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
