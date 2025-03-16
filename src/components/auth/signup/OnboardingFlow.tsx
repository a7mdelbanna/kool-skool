
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

  useEffect(() => {
    if (!isLoading && !user) {
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
            // School details are now saved directly in the SchoolDetailsStep component
            // No need to call saveSchoolDetails here
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

  // School details are now saved directly in the SchoolDetailsStep component
  // This function is kept for reference but not used
  const saveSchoolDetails = async () => {
    if (!user) return;
    
    // If school name is empty, skip this step
    if (!onboardingData.schoolName.trim()) return;
    
    try {
      // Use our new save_school_details RPC function
      const { data, error } = await supabase.rpc(
        'save_school_details',
        {
          user_id_param: user.id,
          school_name_param: onboardingData.schoolName,
          school_logo_param: onboardingData.schoolLogo,
          school_phone_param: onboardingData.schoolPhone || null,
          school_telegram_param: onboardingData.schoolTelegram || null,
          school_whatsapp_param: onboardingData.schoolWhatsapp || null,
          school_instagram_param: onboardingData.schoolInstagram || null
        }
      );
      
      if (error) {
        console.error("Error from save_school_details:", error);
        throw error;
      }
      
      console.log("School saved successfully with ID:", data);
      toast.success("School details saved successfully");
    } catch (error: any) {
      console.error("Error saving school details:", error);
      throw error;
    }
  };

  const saveTeamMembers = async () => {
    if (onboardingData.teamMembers.length === 0) return;
    
    // For now, we're just logging the team members
    // In a real application, you would save this to the database
    console.log("Team members to invite:", onboardingData.teamMembers);
    toast.success(`${onboardingData.teamMembers.length} team members will be invited`);
    
    // You could implement a function here to save team members to the database
    // For example:
    /*
    try {
      const { error } = await supabase
        .from('team_invitations')
        .insert(
          onboardingData.teamMembers.map(member => ({
            school_id: schoolId, // You would need to get this
            email: member.email,
            role: member.role,
            invited_by: user.id
          }))
        );
      
      if (error) throw error;
    } catch (error) {
      console.error("Error inviting team members:", error);
      throw error;
    }
    */
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
