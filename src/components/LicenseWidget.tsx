
import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from 'lucide-react';

interface LicenseDetails {
  license_number: string;
  is_active: boolean;
  days_remaining: number;
  expires_at: string | null;
  school_name: string;
}

const LicenseWidget: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
  // Mock license data for UI display
  const licenseDetails: LicenseDetails = {
    license_number: "LIC-2023-0001",
    is_active: true,
    days_remaining: 45,
    expires_at: "2025-06-30T00:00:00.000Z",
    school_name: "English Gang School"
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">License Status</h2>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-12">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {licenseDetails.license_number && (
            <p className="text-sm text-gray-500">License: {licenseDetails.license_number}</p>
          )}
          
          {licenseDetails.expires_at && (
            <p className="text-sm text-gray-500">
              Expires on: {new Date(licenseDetails.expires_at).toLocaleDateString()}
            </p>
          )}
          
          <div className="mt-2">
            {licenseDetails.is_active ? (
              <div className="text-green-600 font-medium">
                {licenseDetails.days_remaining} days remaining
              </div>
            ) : (
              <div className="text-red-600 font-medium">License is inactive</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseWidget;
