
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AuthContextType = {
  user: any | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (licenseNumber: string) => Promise<{valid: boolean; message: string; licenseId: string | null}>;
  completeSignUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Logged in successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (licenseNumber: string): Promise<{valid: boolean; message: string; licenseId: string | null}> => {
    try {
      setIsLoading(true);
      console.log("Verifying license:", licenseNumber);
      
      // First verify the license
      const { data, error } = await supabase
        .rpc('handle_license_signup', { license_number: licenseNumber });
      
      console.log("License verification response:", { data, error });
      
      if (error) {
        console.error("License verification error:", error);
        toast.error(error.message);
        return { valid: false, message: error.message, licenseId: null };
      }
      
      if (!data || data.length === 0 || !data[0].valid) {
        const errorMessage = data && data[0] ? data[0].message : "Invalid license";
        console.error("License validation failed:", errorMessage);
        toast.error(errorMessage);
        return { 
          valid: false, 
          message: errorMessage, 
          licenseId: null 
        };
      }
      
      const successMessage = data[0].message || "License validated successfully";
      console.log("License validated successfully with ID:", data[0].license_id);
      toast.success(successMessage);
      
      return { 
        valid: true, 
        message: successMessage, 
        licenseId: data[0].license_id 
      };
      
    } catch (error: any) {
      console.error("License signup error:", error);
      const errorMessage = error.message || "An error occurred during license verification";
      toast.error(errorMessage);
      return { valid: false, message: errorMessage, licenseId: null };
    } finally {
      setIsLoading(false);
    }
  };

  const completeSignUp = async (email: string, password: string, userData: any) => {
    try {
      setIsLoading(true);
      console.log("Starting account creation with data:", { email, userData });
      
      // 1. Create user account with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            license_id: userData.licenseId,
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role || "admin"
          }
        }
      });

      if (authError) {
        console.error("Auth error:", authError);
        toast.error(authError.message);
        return;
      }

      if (!authData.user) {
        console.error("No user data returned");
        toast.error("Failed to create user account");
        return;
      }
      
      console.log("User created successfully:", authData.user.id);
      
      // 2. Create school using the RPC procedure
      try {
        console.log("Creating school with name:", userData.schoolName, "license:", userData.licenseNumber);
        
        // Use the RPC method with type assertion
        const { error: schoolError } = await supabase.rpc(
          'create_school_and_update_profile' as any,
          {
            school_name: userData.schoolName,
            license_number: userData.licenseNumber
          }
        );
        
        if (schoolError) {
          console.error("School creation error:", schoolError);
          throw schoolError;
        }
        
        console.log("School created successfully");
      } catch (error: any) {
        console.error("Error in create_school_and_update_profile:", error);
        toast.error(`Failed to set up school: ${error.message}`);
        // Continue anyway since we've already created the user account
      }

      // 3. Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || "admin",
          phone: userData.phone || null,
          whatsapp: userData.whatsapp || null,
          telegram: userData.telegram || null,
          instagram: userData.instagram || null,
          profile_picture: userData.profilePicture || null
        });

      if (profileError) {
        console.error("Error updating profile:", profileError);
        toast.error(`Profile error: ${profileError.message}`);
        // Continue anyway, we'll handle this in onboarding
      }

      toast.success("Account created successfully!");
      
      // No need to navigate here as the component will handle it
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "An error occurred during signup");
      throw error; // Re-throw to let calling component handle it
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign out");
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    completeSignUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
