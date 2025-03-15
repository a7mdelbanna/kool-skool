
import React, { useState } from "react";
import LicenseVerification from "./signup/LicenseVerification";
import AccountCreation from "./signup/AccountCreation";

const SignupForm = () => {
  const [verifiedLicenseId, setVerifiedLicenseId] = useState<string | null>(null);

  // Handle successful license verification
  const handleLicenseVerified = (licenseId: string) => {
    console.log("License verified with ID:", licenseId);
    setVerifiedLicenseId(licenseId);
  };

  return (
    <>
      {!verifiedLicenseId ? (
        <LicenseVerification onLicenseVerified={handleLicenseVerified} />
      ) : (
        <AccountCreation licenseId={verifiedLicenseId} />
      )}
    </>
  );
};

export default SignupForm;
