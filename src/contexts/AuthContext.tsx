
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
      
      // First, update the license record with the school name
      if (userData.licenseId && userData.schoolName) {
        const { error: licenseUpdateError } = await supabase
          .from('licenses')
          .update({ school_name: userData.schoolName })
          .eq('id', userData.licenseId);
          
        if (licenseUpdateError) {
          console.error("Error updating license school name:", licenseUpdateError);
          // Continue with signup even if this fails
        }
      }
      
      // Create user account
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
        toast.error(authError.message);
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create user account");
        return;
      }

      // Create school entry with explicit license_id
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: userData.schoolName || "My School",
          license_id: userData.licenseId, // Explicitly set the license_id
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
        toast.error(schoolError.message);
        return;
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          phone: userData.phone,
          whatsapp: userData.whatsapp,
          telegram: userData.telegram,
          instagram: userData.instagram,
          profile_picture: userData.profilePicture,
          school_id: schoolData.id
        });

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      // Process team members if provided
      if (userData.teamMembers && userData.teamMembers.length > 0) {
        // In a real app, you would create invitations for team members
        // This would typically involve sending emails with signup links
        console.log("Team members to invite:", userData.teamMembers);
        
        // For now, just log the information
        toast.success(`${userData.teamMembers.length} team members will be invited`);
      }

      toast.success("Account created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during signup");
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
