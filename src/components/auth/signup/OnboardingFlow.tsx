
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

// Type for the user's onboarding data
interface OnboardingData {
  // Personal details
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  phone: string;
  telegram: string;
  whatsapp: string;
  instagram: string;
  
  // School details
  schoolName: string;
  schoolLogo: string | null;
  schoolPhone: string;
  schoolTelegram: string;
  schoolWhatsapp: string;
  schoolInstagram: string;
  
  // Team members
  teamMembers: { email: string; role: string }[];
}

// Type definitions for our custom RPC functions
type UpdateUserProfileParams = {
  user_id: string;
  first_name_param: string;
  last_name_param: string;
  phone_param: string;
  profile_picture_param: string | null;
  telegram_param: string | null;
  whatsapp_param: string | null;
  instagram_param: string | null;
};

type GetUserSchoolIdParams = {
  user_id_param: string;
};

type SchoolIdData = {
  school_id: string;
}[];

const OnboardingFlow = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;
  
  // Initialize onboarding data with empty values
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

  // If user is not logged in, redirect to auth page
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  // Update onboarding data with form values
  const updateData = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  // Go to next step
  const nextStep = async (skipSave = false) => {
    if (currentStep < totalSteps) {
      // If not skipping and we're at a step that requires saving
      if (!skipSave) {
        try {
          setLoading(true);
          
          if (currentStep === 1) {
            // Save personal details
            await savePersonalDetails();
          } else if (currentStep === 2) {
            // Save school details
            await saveSchoolDetails();
          } else if (currentStep === 3) {
            // Save team members
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

  // Go to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(current => current - 1);
    }
  };

  // Save personal details to database using our custom RPC function
  const savePersonalDetails = async () => {
    if (!user) return;
    
    try {
      // Correct use of RPC function with proper type parameters
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

  // Save school details to database
  const saveSchoolDetails = async () => {
    if (!user) return;
    
    // Skip if no school name is provided
    if (!onboardingData.schoolName.trim()) return;
    
    // First get the user's profile to get the school_id using our custom function
    // Correct use of RPC function with proper type parameters
    const { data, error: profileError } = await supabase.rpc(
      'get_user_school_id',
      {
        user_id_param: user.id
      }
    );
    
    if (profileError) throw profileError;
    
    // Extract the school_id from the returned data
    // The function returns a table with a single column 'school_id'
    // Need to check data properly since it could be various types
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("No school associated with this account");
    }
    
    // Type assertion after we've verified it's an array with data
    const schoolData = data as SchoolIdData;
    if (!schoolData[0]?.school_id) {
      throw new Error("No school ID found in profile");
    }
    
    const schoolId = schoolData[0].school_id;
    
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

  // Process team member invitations
  const saveTeamMembers = async () => {
    // Skip if no team members are provided
    if (onboardingData.teamMembers.length === 0) return;
    
    // Here you would implement the team member invitation logic
    // This would typically involve creating invitation records and sending emails
    // For now, we'll just log the invitations
    console.log("Team members to invite:", onboardingData.teamMembers);
    toast.success(`${onboardingData.teamMembers.length} team members will be invited`);
  };

  // Finish onboarding
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
