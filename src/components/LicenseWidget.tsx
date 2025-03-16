
import React, { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';

interface LicenseDetails {
  id: string;
  license_number: string;
  is_active: boolean;
  duration_days: number;
  days_remaining: number;
  expires_at: string | null;
  school_name: string;
}

const fetchLicenseDetails = async (): Promise<LicenseDetails | null> => {
  try {
    // Get current user from localStorage
    const userString = localStorage.getItem('user');
    if (!userString) {
      console.error('No user found in localStorage');
      return null;
    }
    
    const user = JSON.parse(userString);
    const schoolId = user.schoolId;
    
    if (!schoolId) {
      console.error('No school ID found for user');
      return null;
    }
    
    // Get school details including license_id
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('name, license_id')
      .eq('id', schoolId)
      .single();
    
    if (schoolError) {
      console.error('Error fetching school:', schoolError);
      return null;
    }
    
    if (!schoolData.license_id) {
      console.error('No license ID found for school');
      return null;
    }
    
    // Get license details
    const { data: licenseData, error: licenseError } = await supabase
      .from('licenses')
      .select('id, license_key, expires_at, duration_days')
      .eq('id', schoolData.license_id)
      .single();
    
    if (licenseError) {
      console.error('Error fetching license:', licenseError);
      return null;
    }
    
    // Calculate days remaining
    const now = new Date();
    const expiryDate = licenseData.expires_at ? new Date(licenseData.expires_at) : null;
    const daysRemaining = expiryDate 
      ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) 
      : 0;
    const isActive = expiryDate ? expiryDate > now : false;
    
    return {
      id: licenseData.id,
      license_number: licenseData.license_key,
      is_active: isActive,
      duration_days: licenseData.duration_days || 0,
      days_remaining: daysRemaining,
      expires_at: licenseData.expires_at,
      school_name: schoolData.name
    };
  } catch (error) {
    console.error('Error fetching license details:', error);
    return null;
  }
};

const LicenseWidget: React.FC = () => {
  const { data: licenseDetails, isLoading, error, refetch } = useQuery({
    queryKey: ['licenseDetails'],
    queryFn: fetchLicenseDetails,
    enabled: !!localStorage.getItem('user'), // Only run when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">License Status</h2>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      
      {isLoading ? (
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
