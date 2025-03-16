
import React, { useState } from "react";
import LicenseVerification from "./signup/LicenseVerification";
import AccountCreation from "./signup/AccountCreation";
import { LicenseData } from "./signup/LicenseVerification";

const SignupForm = () => {
  const [verifiedLicense, setVerifiedLicense] = useState<LicenseData | null>(null);

  const handleLicenseVerified = (licenseData: LicenseData) => {
    console.log("License verified in SignupForm:", licenseData);
    setVerifiedLicense(licenseData);
  };

  return (
    <div className="w-full space-y-6">
      {verifiedLicense ? (
        <AccountCreation licenseData={verifiedLicense} />
      ) : (
        <LicenseVerification onLicenseVerified={handleLicenseVerified} />
      )}
    </div>
  );
};

export default SignupForm;
