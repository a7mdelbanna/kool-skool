
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LicenseDetails {
  id: string;
  license_number: string;
  is_active: boolean;
  duration_days: number;
  days_remaining: number;
  expires_at: string | null;
  school_name: string;
}

const LicenseWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [licenseDetails, setLicenseDetails] = useState<LicenseDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLicenseDetails = async () => {
      try {
        setLoading(true);
        // First get the school ID for the current user
        const { data: schoolData, error: schoolError } = await supabase
          .rpc('get_user_school_id');

        if (schoolError) throw schoolError;
        if (!schoolData || !schoolData[0]?.school_id) {
          throw new Error('No school found for this user');
        }

        // Get school details to get the license ID
        const { data: schoolInfo, error: schoolInfoError } = await supabase
          .rpc('get_school_info', {
            school_id_param: schoolData[0].school_id
          });

        if (schoolInfoError) throw schoolInfoError;
        if (!schoolInfo || !schoolInfo[0]?.license_id) {
          throw new Error('No license found for this school');
        }

        // Get license details using the license ID
        const { data: licenseData, error: licenseError } = await supabase
          .rpc('get_license_details', {
            license_id_param: schoolInfo[0].license_id
          });

        if (licenseError) throw licenseError;
        if (!licenseData || licenseData.length === 0) {
          throw new Error('License details not found');
        }

        setLicenseDetails(licenseData[0]);
        setError(null);
      } catch (error) {
        console.error('Error fetching license details:', error);
        setError('Error loading license information');
        toast({
          title: "Error",
          description: "Failed to load license information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLicenseDetails();
  }, [toast]);

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
