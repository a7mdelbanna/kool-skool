
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
  completeSignUp: (email: string, password: string, userData: any) => Promise<{success: boolean; message: string}>;
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

  const completeSignUp = async (email: string, password: string, userData: any): Promise<{success: boolean; message: string}> => {
    try {
      setIsLoading(true);
      
      if (!userData.licenseId) {
        console.error("Missing license ID during account creation");
        return { success: false, message: "Missing license ID" };
      }
      
      console.log("Creating account with license:", userData.licenseId);
      
      // Create user account with license ID in user metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            license_id: userData.licenseId,
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });

      if (authError) {
        console.error("Auth signup error:", authError);
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        console.error("No user data returned from signup");
        return { success: false, message: "Failed to create user account" };
      }

      // Verify that license exists before continuing
      try {
        const { data: licenseData, error: licenseCheckError } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', userData.licenseId)
          .maybeSingle();
        
        if (licenseCheckError) {
          console.error("Error checking license:", licenseCheckError);
          return { 
            success: false, 
            message: "Error verifying license: " + licenseCheckError.message 
          };
        }
        
        if (!licenseData) {
          console.error("License not found during account creation");
          return { 
            success: false, 
            message: "License not found. Please verify your license." 
          };
        }
      } catch (error: any) {
        console.error("License check error:", error);
        return { success: false, message: "Error verifying license" };
      }
      
      // Create school entry
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: userData.schoolName || "My School",
            license_id: userData.licenseId,
            created_by: authData.user.id,
            logo: userData.schoolLogo,
            phone: userData.schoolPhone,
            telegram: userData.schoolTelegram,
            whatsapp: userData.schoolWhatsapp,
            instagram: userData.schoolInstagram
          })
          .select('id')
          .single();

        if (schoolError) {
          console.error("School creation error:", schoolError);
          return { success: false, message: schoolError.message };
        }

        // Create profile entry with license ID
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: "admin", // Default role for new users
            phone: userData.phone,
            whatsapp: userData.whatsapp,
            telegram: userData.telegram,
            instagram: userData.instagram,
            profile_picture: userData.profilePicture,
            school_id: schoolData.id
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          return { success: false, message: profileError.message };
        }

        // Update license with school info and mark as used by this user
        const { error: updateLicenseError } = await supabase
          .from('licenses')
          .update({ 
            school_name: userData.schoolName || "My School",
            used_by: authData.user.id
          })
          .eq('id', userData.licenseId);
          
        if (updateLicenseError) {
          console.error("License update error:", updateLicenseError);
          // Non-critical error, continue anyway
        }
      } catch (error: any) {
        console.error("Data creation error:", error);
        return { success: false, message: error.message || "Error creating school/profile data" };
      }

      console.log("Account created successfully");
      return { success: true, message: "Account created successfully!" };
    } catch (error: any) {
      console.error("Complete signup error:", error);
      return { success: false, message: error.message || "An error occurred during signup" };
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
