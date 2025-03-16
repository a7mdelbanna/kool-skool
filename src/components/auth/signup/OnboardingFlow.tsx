
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import PersonalDetailsStep from "./onboarding/PersonalDetailsStep";
import SchoolDetailsStep from "./onboarding/SchoolDetailsStep";
import TeamMembersStep from "./onboarding/TeamMembersStep";
import WelcomeStep from "./onboarding/WelcomeStep";
import { toast } from "sonner";

interface OnboardingData {
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  phone: string;
  telegram: string;
  whatsapp: string;
  instagram: string;
  
  schoolName: string;
  schoolLogo: string | null;
  schoolPhone: string;
  schoolTelegram: string;
  schoolWhatsapp: string;
  schoolInstagram: string;
  
  teamMembers: { email: string; role: string }[];
}

const OnboardingFlow = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;
  
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    profilePicture: null,
    phone: "",
    telegram: "",
    whatsapp: "",
    instagram: "",
    
    schoolName: "",
    schoolLogo: null,
    schoolPhone: "",
    schoolTelegram: "",
    schoolWhatsapp: "",
    schoolInstagram: "",
    
    teamMembers: []
  });

  // Load initial data from database if available
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error("Error loading profile:", profileError);
        } else if (profileData) {
          setOnboardingData(prev => ({
            ...prev,
            firstName: profileData.first_name || "",
            lastName: profileData.last_name || "",
            profilePicture: profileData.profile_picture || null,
            phone: profileData.phone || "",
            telegram: profileData.telegram || "",
            whatsapp: profileData.whatsapp || "",
            instagram: profileData.instagram || "",
          }));
        }
        
        // Get user's school
        if (profileData?.school_id) {
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('*')
            .eq('id', profileData.school_id)
            .single();
            
          if (schoolError) {
            console.error("Error loading school:", schoolError);
          } else if (schoolData) {
            setOnboardingData(prev => ({
              ...prev,
              schoolName: schoolData.name || "",
              schoolLogo: schoolData.logo || null,
              schoolPhone: schoolData.phone || "",
              schoolTelegram: schoolData.telegram || "",
              schoolWhatsapp: schoolData.whatsapp || "",
              schoolInstagram: schoolData.instagram || "",
            }));
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (!isLoading && user) {
      loadInitialData();
    } else if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const updateData = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  const nextStep = async (skipSave = false) => {
    if (currentStep < totalSteps) {
      if (!skipSave) {
        try {
          setLoading(true);
          
          if (currentStep === 1) {
            await savePersonalDetails();
          } else if (currentStep === 2) {
            await saveSchoolDetails();
          } else if (currentStep === 3) {
            await saveTeamMembers();
          }
        } catch (error: any) {
          console.error(`Error saving step ${currentStep}:`, error);
          toast.error(error.message || "Failed to save your information");
          setLoading(false);
          return;
        } finally {
          setLoading(false);
        }
      }
      
      setCurrentStep(current => current + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(current => current - 1);
    }
  };

  const savePersonalDetails = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc(
        'update_user_profile', 
        {
          user_id: user.id,
          first_name_param: onboardingData.firstName,
          last_name_param: onboardingData.lastName,
          phone_param: onboardingData.phone,
          profile_picture_param: onboardingData.profilePicture,
          telegram_param: onboardingData.telegram || null,
          whatsapp_param: onboardingData.whatsapp || null,
          instagram_param: onboardingData.instagram || null
        }
      );
      
      if (error) throw error;
      toast.success("Personal details saved successfully");
    } catch (error: any) {
      console.error("Error saving personal details:", error);
      throw error;
    }
  };

  const saveSchoolDetails = async () => {
    if (!user) return;
    
    if (!onboardingData.schoolName.trim()) return;
    
    const { data, error: profileError } = await supabase.rpc(
      'get_user_school_id',
      {
        user_id_param: user.id
      }
    );
    
    if (profileError) throw profileError;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("No school associated with this account");
    }
    
    if (!data[0]?.school_id) {
      throw new Error("No school ID found in profile");
    }
    
    const schoolId = data[0].school_id;
    
    const { error } = await supabase
      .from('schools')
      .update({
        name: onboardingData.schoolName,
        logo: onboardingData.schoolLogo,
        phone: onboardingData.schoolPhone || null,
        telegram: onboardingData.schoolTelegram || null,
        whatsapp: onboardingData.schoolWhatsapp || null,
        instagram: onboardingData.schoolInstagram || null
      })
      .eq('id', schoolId);
    
    if (error) throw error;
    toast.success("School details saved successfully");
  };

  const saveTeamMembers = async () => {
    if (onboardingData.teamMembers.length === 0) return;
    
    try {
      // Get the user's school ID first
      const { data: schoolData, error: schoolError } = await supabase.rpc(
        'get_user_school_id',
        { user_id_param: user?.id }
      );
      
      if (schoolError) throw schoolError;
      
      if (!schoolData || !Array.isArray(schoolData) || schoolData.length === 0 || !schoolData[0]?.school_id) {
        throw new Error("Could not find your school information");
      }
      
      const schoolId = schoolData[0].school_id;
      
      // For each team member, create a temporary password and invite them
      for (const member of onboardingData.teamMembers) {
        const tempPassword = Math.random().toString(36).slice(-8) + '!A1'; // Generate a secure random password
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: member.email,
          password: tempPassword,
          options: {
            data: {
              role: member.role,
              invited_by: user?.id
            }
          }
        });
        
        if (authError) {
          console.error(`Error inviting ${member.email}:`, authError);
          continue; // Skip to next member on error
        }
        
        if (!authData.user) {
          console.error(`Failed to create account for ${member.email}`);
          continue;
        }
        
        // Create profile with school connection
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: member.email,
            role: member.role,
            school_id: schoolId
          });
          
        if (profileError) {
          console.error(`Error creating profile for ${member.email}:`, profileError);
        }
      }
      
      const count = onboardingData.teamMembers.length;
      toast.success(`${count} team member${count !== 1 ? 's' : ''} invited successfully`);
      
    } catch (error: any) {
      console.error("Error inviting team members:", error);
      throw error;
    }
  };

  const finishOnboarding = () => {
    toast.success("Onboarding completed! Welcome to the platform.");
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-[400px] w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-center mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground text-center mb-4">Step {currentStep} of {totalSteps}</p>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
          
          {currentStep === 1 && (
            <PersonalDetailsStep 
              data={onboardingData} 
              updateData={updateData} 
              onNext={nextStep} 
              loading={loading}
            />
          )}
          
          {currentStep === 2 && (
            <SchoolDetailsStep 
              data={onboardingData} 
              updateData={updateData} 
              onNext={nextStep} 
              onPrev={prevStep} 
              onSkip={() => nextStep(true)} 
              loading={loading}
            />
          )}
          
          {currentStep === 3 && (
            <TeamMembersStep 
              data={onboardingData} 
              updateData={updateData} 
              onNext={nextStep} 
              onPrev={prevStep} 
              onSkip={() => nextStep(true)} 
              loading={loading}
            />
          )}
          
          {currentStep === 4 && (
            <WelcomeStep 
              firstName={onboardingData.firstName} 
              onFinish={finishOnboarding} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
