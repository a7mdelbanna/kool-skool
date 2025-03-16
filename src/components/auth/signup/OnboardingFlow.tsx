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
    
    const schoolData = data as {school_id: string}[];
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

  const saveTeamMembers = async () => {
    if (onboardingData.teamMembers.length === 0) return;
    
    console.log("Team members to invite:", onboardingData.teamMembers);
    toast.success(`${onboardingData.teamMembers.length} team members will be invited`);
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
