import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import LicenseVerificationStep from "./LicenseVerificationStep";
import AccountDetailsStep from "./AccountDetailsStep";
import { AccountFormValues } from "./AccountDetailsStep";
import { Loader2 } from "lucide-react";

// These types would ideally be in a separate file, but for simplicity we'll keep them here
export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  profilePicture?: string;
};

export type SchoolFormValues = {
  schoolName: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolTelegram?: string;
  schoolWhatsapp?: string;
  schoolInstagram?: string;
};

export type TeamMember = {
  email: string;
  role: string;
};

const SignupSteps = () => {
  const { signUp, completeSignUp, isLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<AccountFormValues | null>(null);

  // For debugging purposes
  useEffect(() => {
    console.log("Current step is now:", step);
    console.log("License ID:", licenseId);
  }, [step, licenseId]);

  // Handle verification step
  const handleLicenseVerified = (verifiedLicenseId: string) => {
    console.log("License verified with ID:", verifiedLicenseId);
    setLicenseId(verifiedLicenseId);
    setStep(2);
  };

  // Handle account creation
  const handleAccountCreated = (data: AccountFormValues) => {
    console.log("Account data received:", data);
    setAccountData(data);
    
    // For testing - in a full implementation, we would continue to profile setup
    handleFinalSubmit(data);
  };

  // Back button handlers
  const goBack = () => {
    setStep(step - 1);
  };

  // Handle final submission (simplified for testing)
  const handleFinalSubmit = async (accountData: AccountFormValues) => {
    if (!licenseId) {
      toast.error("Missing license information");
      return;
    }

    try {
      // Simplified userData for testing
      const userData = {
        licenseId: licenseId,
        firstName: "Test",
        lastName: "User",
        schoolName: "Test School",
      };

      await completeSignUp(accountData.email, accountData.password, userData);
      
      // Trigger confetti animation on success
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("An error occurred during signup");
    }
  };

  // Render the current step
  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <LicenseVerificationStep 
            onLicenseVerified={handleLicenseVerified} 
            isLoading={isLoading}
            verifyLicense={signUp}
          />
        );
      case 2:
        return (
          <AccountDetailsStep 
            onSubmit={handleAccountCreated} 
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {[1, 2].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === stepNumber
                      ? "bg-primary text-primary-foreground"
                      : step > stepNumber
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 2 && (
                  <div 
                    className={`h-1 w-4 ${
                      step > stepNumber ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Step {step} of 2</span>
        </div>
        <h3 className="text-sm font-medium">
          {step === 1 && "License Verification"}
          {step === 2 && "Account Details"}
        </h3>
      </div>
      {renderStep()}
    </div>
  );
};

export default SignupSteps;
