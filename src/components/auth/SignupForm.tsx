
import React, { useState, useEffect } from "react";
import LicenseVerification from "./signup/LicenseVerification";
import AccountCreation from "./signup/AccountCreation";

const SignupForm = () => {
  const [verifiedLicenseId, setVerifiedLicenseId] = useState<string | null>(null);

  // Handle successful license verification
  const handleLicenseVerified = (licenseId: string) => {
    console.log("License verified with ID:", licenseId);
    // Force state update to trigger component re-render
    setVerifiedLicenseId(licenseId);
  };

  // Log when the verified license changes for debugging
  useEffect(() => {
    console.log("Current verifiedLicenseId state:", verifiedLicenseId);
  }, [verifiedLicenseId]);

  return (
    <div className="w-full">
      {!verifiedLicenseId ? (
        <LicenseVerification onLicenseVerified={handleLicenseVerified} />
      ) : (
        <AccountCreation licenseId={verifiedLicenseId} />
      )}
    </div>
  );
};

export default SignupForm;
