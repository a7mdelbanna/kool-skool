
import React, { useState } from "react";
import LicenseVerification from "./signup/LicenseVerification";
import AccountCreation from "./signup/AccountCreation";

// Define the license data interface directly in this file
export interface LicenseData {
  licenseId: string;
  licenseNumber: string;
}

const SignupForm = () => {
  // Instead of using state for conditional rendering, use a step-based approach
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);

  const handleLicenseVerified = (data: LicenseData) => {
    console.log("License verified in SignupForm, setting state and moving to step 2:", data);
    setLicenseData(data);
    // Force step change after license verification
    setCurrentStep(2);
  };

  // Render the appropriate step based on currentStep
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <LicenseVerification onLicenseVerified={handleLicenseVerified} />;
      case 2:
        return licenseData ? <AccountCreation licenseData={licenseData} /> : (
          <div className="text-center p-4 bg-yellow-100 rounded-lg">
            License data is missing. Please verify your license again.
            <button 
              onClick={() => setCurrentStep(1)}
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
