
import React from "react";
import LicenseVerification from "./signup/LicenseVerification";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SignupForm = () => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full space-y-6">
      <LicenseVerification />
      
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Already have an account? 
          <Button variant="link" className="p-0 ml-1" onClick={() => navigate("/auth")}>
            Log in
          </Button>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
