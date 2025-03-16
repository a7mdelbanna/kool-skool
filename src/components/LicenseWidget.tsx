
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from 'lucide-react';

interface LicenseDetails {
  id: string;
  license_number: string;
  is_active: boolean;
  duration_days: number;
  days_remaining: number;
  expires_at: string | null;
  school_name: string;
}

// Dummy license data
const dummyLicenseDetails: LicenseDetails = {
  id: 'lic-12345',
  license_number: 'TUT-PRO-2023-12345',
  is_active: true,
  duration_days: 365,
  days_remaining: 280,
  expires_at: '2025-12-31T00:00:00Z',
  school_name: 'Sample Language School'
};

const LicenseWidget: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [licenseDetails, setLicenseDetails] = React.useState<LicenseDetails | null>(dummyLicenseDetails);
  const [error, setError] = React.useState<string | null>(null);

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
      ) : error ? (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-600">Error loading license information</AlertTitle>
          <AlertDescription className="text-red-500">
            Please refresh the page or contact support if this issue persists.
          </AlertDescription>
        </Alert>
      ) : licenseDetails ? (
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
      ) : (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-600">Error loading license information</AlertTitle>
          <AlertDescription className="text-red-500">
            Please refresh the page or contact support if this issue persists.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LicenseWidget;
