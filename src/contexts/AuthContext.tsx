
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

  const signUp = async (licenseNumber: string) => {
    try {
      setIsLoading(true);
      
      // First verify the license
      const { data, error } = await supabase
        .rpc('handle_license_signup', { license_number: licenseNumber });
      
      if (error) {
        toast.error(error.message);
        return { valid: false, message: error.message, licenseId: null };
      }
      
      if (!data || !data[0].valid) {
        toast.error(data ? data[0].message : "Invalid license");
        return { 
          valid: false, 
          message: data ? data[0].message : "Invalid license number", 
          licenseId: null 
        };
      }
      
      return { 
        valid: true, 
        message: data[0].message, 
        licenseId: data[0].license_id 
      };
      
    } catch (error: any) {
      toast.error(error.message || "An error occurred during license verification");
      return { valid: false, message: error.message || "An error occurred", licenseId: null };
    } finally {
      setIsLoading(false);
    }
  };

  const completeSignUp = async (email: string, password: string, userData: any) => {
    try {
      setIsLoading(true);
      
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            license_id: userData.licenseId,
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

      // Create school entry
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: userData.schoolName || "My School",
          license_id: userData.licenseId,
          created_by: authData.user.id
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
          profile_picture: userData.profilePicture,
          school_id: schoolData.id
        });

      if (profileError) {
        toast.error(profileError.message);
        return;
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
