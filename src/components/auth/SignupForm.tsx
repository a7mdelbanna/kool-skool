
import React, { useState, useEffect } from "react";
import LicenseVerification from "./signup/LicenseVerification";
import AccountCreation from "./signup/AccountCreation";
import { toast } from "sonner";

// Define the license data interface directly in this file
export interface LicenseData {
  licenseId: string;
  licenseNumber: string;
}

const SignupForm = () => {
  // Use a step-based approach with better state management
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  
  // Use this to track when license verification succeeds
  const [licenseVerified, setLicenseVerified] = useState<boolean>(false);
  
  // Effect to handle the transition after license verification
  useEffect(() => {
    if (licenseVerified && licenseData) {
      console.log("License verified, transitioning to account creation", licenseData);
      // Ensure UI update by using a short timeout
      setTimeout(() => {
        setCurrentStep(2);
      }, 100);
    }
  }, [licenseVerified, licenseData]);

  const handleLicenseVerified = (data: LicenseData) => {
    console.log("License verified in SignupForm with data:", data);
    // Set both states to trigger the effect
    setLicenseData(data);
    setLicenseVerified(true);
  };

  // Render the appropriate step based on currentStep
  const renderStep = () => {
    console.log("Rendering step:", currentStep, "License data:", licenseData);
    
    switch (currentStep) {
      case 1:
        return <LicenseVerification onLicenseVerified={handleLicenseVerified} />;
      case 2:
        return licenseData ? <AccountCreation licenseData={licenseData} /> : (
          <div className="text-center p-4 bg-yellow-100 rounded-lg">
            License data is missing. Please verify your license again.
            <button 
              onClick={() => {
                setCurrentStep(1);
                setLicenseVerified(false);
              }}
              className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              Go Back
            </button>
          </div>
        );
      default:
        return <LicenseVerification onLicenseVerified={handleLicenseVerified} />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {renderStep()}
    </div>
  );
};

export default SignupForm;
