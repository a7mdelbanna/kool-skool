
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import SubscriptionInfo from "@/components/school-setup/SubscriptionInfo";

const SchoolSetup = () => {
  return (
    <div className="container space-y-6 py-6">
      <h1 className="text-3xl font-bold">School Setup</h1>
      
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>School Administration</AlertTitle>
        <AlertDescription>
          View your school subscription and manage staff members.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-6">
        <SubscriptionInfo />
      </div>
    </div>
  );
};

export default SchoolSetup;
