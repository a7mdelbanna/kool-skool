
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import LicenseManager from "@/components/school-setup/LicenseManager";

const SchoolSetup = () => {
  return (
    <div className="container space-y-6 py-6">
      <h1 className="text-3xl font-bold">School Setup</h1>
      
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>School Administration</AlertTitle>
        <AlertDescription>
          Set up your school, manage licenses, and add staff members.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-6">
        <LicenseManager />
      </div>
    </div>
  );
};

export default SchoolSetup;
