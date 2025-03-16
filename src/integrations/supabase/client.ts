
// This file provides mock Supabase client functionality
import type { Database } from './types';

// Mock client for development without actual Supabase connection
export const supabase = {
  // Add mock methods as needed for UI display
  rpc: (functionName: string, params?: any) => {
    console.log(`Mock RPC call to ${functionName} with params:`, params);
    
    return {
      data: null,
      error: null
    };
  },
  
  // Add other mock methods as needed
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signIn: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null })
  },
  
  // Add storage mock if needed
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: File) => 
        Promise.resolve({ data: { path }, error: null })
    })
  }
};
