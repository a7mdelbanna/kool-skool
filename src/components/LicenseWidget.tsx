
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLicenseDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch the user's school and license info
        const { data, error: licenseError } = await supabase
          .rpc('get_user_school_info');

        if (licenseError) throw licenseError;
        
        // Ensure we have data before proceeding
        if (!data || !Array.isArray(data) || data.length === 0) {
          // User might not be associated with a school yet
          setLicenseDetails(null);
          setError('No license information found');
          setLoading(false);
          return;
        }

        const userInfo = data[0];
        
        // Get detailed license information
        const { data: licenseData, error: detailsError } = await supabase
          .rpc('get_license_details', {
            license_id_param: userInfo.license_id
          });

        if (detailsError) throw detailsError;
        
        // Check if we have valid license data
        if (!licenseData || !Array.isArray(licenseData) || licenseData.length === 0) {
          throw new Error('License details not found');
        }

        setLicenseDetails(licenseData[0]);
        setError(null);
      } catch (err) {
        console.error('Error fetching license details:', err);
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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          fetchLicenseDetails();
        } else if (event === 'SIGNED_OUT') {
          setLicenseDetails(null);
        }
      }
    );

    fetchLicenseDetails();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [toast, navigate]);

  const handleSchoolSetup = () => {
    navigate('/school-setup');
  }

  const handleVerifyNewLicense = () => {
    navigate('/license-verification');
  }

  // Calculate percentage of days remaining
  const getDaysRemainingPercentage = () => {
    if (!licenseDetails) return 0;
    const percentage = (licenseDetails.days_remaining / licenseDetails.duration_days) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">License Status</h2>
        <Shield className="h-5 w-5 text-primary" />
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-12">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-red-600">No active license</AlertTitle>
            <AlertDescription className="text-red-500">
              You don't have an active license or school association.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleSchoolSetup} 
              className="w-full"
            >
              Complete School Setup
            </Button>
            <Button
              onClick={handleVerifyNewLicense}
              variant="outline"
              className="w-full"
            >
              Verify New License
            </Button>
          </div>
        </div>
      ) : licenseDetails ? (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-md border border-gray-100">
            <div className="flex items-center mb-2">
              {licenseDetails.is_active ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`font-medium ${licenseDetails.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {licenseDetails.is_active ? 'Active License' : 'Inactive License'}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">License Number:</span>
                <span className="text-sm font-medium">{licenseDetails.license_number}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">School:</span>
                <span className="text-sm font-medium">{licenseDetails.school_name}</span>
              </div>
              
              {licenseDetails.expires_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Expires on:</span>
                  <span className="text-sm font-medium">
                    {new Date(licenseDetails.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Time Remaining</span>
              <span className={`text-sm font-medium ${licenseDetails.days_remaining > 7 ? 'text-green-600' : 'text-amber-600'}`}>
                {licenseDetails.days_remaining} days
              </span>
            </div>
            <Progress value={getDaysRemainingPercentage()} className="h-2" />
          </div>
          
          <Button
            onClick={handleVerifyNewLicense}
            variant="outline"
            className="w-full"
          >
            Change License
          </Button>
        </div>
      ) : (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-600">No license information available</AlertTitle>
          <AlertDescription className="text-red-500">
            Please contact your administrator to setup a license.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LicenseWidget;
