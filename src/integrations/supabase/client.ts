
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
  
  // Auth methods
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signIn: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    signUp: () => Promise.resolve({ data: null, error: null })
  },
  
  // Storage mock
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: File) => 
        Promise.resolve({ data: { path }, error: null })
    })
  },
  
  // Table operations
  from: (tableName: string) => ({
    select: () => ({
      eq: () => ({
        data: null,
        error: null
      }),
      data: null,
      error: null
    }),
    insert: (data: any) => {
      console.log(`Mock insert into ${tableName}:`, data);
      return Promise.resolve({ data, error: null });
    },
    update: (data: any) => {
      console.log(`Mock update in ${tableName}:`, data);
      return Promise.resolve({ data, error: null });
    },
    delete: () => {
      console.log(`Mock delete from ${tableName}`);
      return Promise.resolve({ data: null, error: null });
    }
  })
};
