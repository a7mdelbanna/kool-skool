
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
  completeSignUp: (email: string, password: string, userData: any) => Promise<{success: boolean; error?: string}>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthProvider getSession:", session);
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event, "Session:", session);
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
      
      // Normalize the license number (remove spaces, convert to uppercase)
      const normalizedLicense = licenseNumber.trim().toUpperCase();
      console.log("Verifying license:", normalizedLicense);
      
      // Direct database query
      const { data: licenses, error: licenseError } = await supabase
        .from('licenses')
        .select('id, is_active, used_by')
        .eq('license_number', normalizedLicense)
        .eq('is_active', true);
      
      if (licenseError) {
        console.error("License verification error:", licenseError);
        return { 
          valid: false, 
          message: licenseError.message || "An error occurred during license verification", 
          licenseId: null 
        };
      }
      
      console.log("License query results:", licenses);
      
      // If no licenses found or the array is empty, the license doesn't exist or isn't active
      if (!licenses || licenses.length === 0) {
        console.error("License validation failed: License not found or not active");
        
        // For development only: Create a new license if it doesn't exist
        if (import.meta.env.DEV) {
          console.log("Development mode: Creating test license");
          const { data: newLicense, error: createError } = await supabase
            .from('licenses')
            .insert({
              license_number: normalizedLicense,
              duration_days: 30,
              is_active: true,
              school_name: "Test School"
            })
            .select('id');
            
          if (createError) {
            console.error("Error creating test license:", createError);
            return { 
              valid: false,
              message: "Error creating test license", 
              licenseId: null 
            };
          }
          
          if (newLicense && newLicense.length > 0) {
            console.log("Created test license:", newLicense[0]);
            return { 
              valid: true,
              message: "Test license created successfully", 
              licenseId: newLicense[0].id 
            };
          }
        }
        
        return { 
          valid: false, 
          message: "License not found or not active", 
          licenseId: null 
        };
      }
      
      const license = licenses[0];
      
      // Get current user, if any
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user?.id;
      
      // Check if license is already used by someone else
      // If used_by is null, it means it's a new unused license
      if (license.used_by && license.used_by !== currentUser) {
        console.error("License validation failed: License already in use by another account");
        return { 
          valid: false, 
          message: "This license is already in use by another account", 
          licenseId: null 
        };
      }
      
      console.log("License validated successfully with ID:", license.id);
      
      return { 
        valid: true, 
        message: "License validated successfully", 
        licenseId: license.id 
      };
      
    } catch (error: any) {
      console.error("License signup error:", error);
      return { 
        valid: false, 
        message: error.message || "An error occurred during license verification", 
        licenseId: null 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const completeSignUp = async (email: string, password: string, userData: any): Promise<{success: boolean; error?: string}> => {
    try {
      setIsLoading(true);
      
      if (!userData.licenseId) {
        toast.error("Missing license ID. Please verify your license first.");
        return { success: false, error: "Missing license ID" };
      }
      
      console.log("CompleteSignUp with licenseId:", userData.licenseId);
      console.log("CompleteSignUp with licenseNumber:", userData.licenseNumber);
      
      const { data: licenseData, error: licenseError } = await supabase
        .rpc('get_license_by_id', { license_id_param: userData.licenseId });
      
      console.log("License data from RPC:", licenseData);
      
      if (licenseError || !licenseData || licenseData.length === 0) {
        console.error("License verification failed:", licenseError || "No license data");
        toast.error("License verification failed. Please verify your license again.");
        return { success: false, error: "License verification failed" };
      }
      
      const licenseInfo = licenseData[0];
      console.log("License verification succeeded:", licenseInfo);
      
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
        console.error("Auth error during signup:", authError);
        toast.error(authError.message);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        console.error("Failed to create user account - no user data returned");
        toast.error("Failed to create user account");
        return { success: false, error: "Failed to create user account" };
      }

      console.log("User created successfully, creating school...");
      console.log("User ID:", authData.user.id);
      
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
        console.error("Error creating school:", schoolError);
        toast.error(`Error creating school: ${schoolError.message}`);
        return { success: false, error: `Error creating school: ${schoolError.message}` };
      }

      console.log("School created with ID:", schoolData.id);
      console.log("School data full:", schoolData);

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'admin',
          phone: userData.phone,
          whatsapp: userData.whatsapp,
          telegram: userData.telegram,
          instagram: userData.instagram,
          profile_picture: userData.profilePicture,
          school_id: schoolData.id
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        toast.error(`Error creating profile: ${profileError.message}`);
        return { success: false, error: `Error creating profile: ${profileError.message}` };
      }

      console.log("Profile created successfully. Signup complete.");
      toast.success("Account created successfully!");
      
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession) {
        console.log("New session established:", newSession);
        setSession(newSession);
        setUser(newSession.user);
      } else {
        console.log("No session after signup - attempting login with credentials");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          console.error("Error signing in after account creation:", signInError);
        } else if (signInData.session) {
          console.log("Successfully logged in after account creation");
          setSession(signInData.session);
          setUser(signInData.session.user);
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Complete signup error:", error);
      toast.error(error.message || "An error occurred during signup");
      return { success: false, error: error.message || "An error occurred during signup" };
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
