
import React, { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

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
    
    console.log('Fetching license details for school ID:', schoolId);
    
    // First, let's debug what schools exist
    const { data: allSchools, error: debugError } = await supabase
      .from('schools')
      .select('id, name, license_id')
      .limit(5);
    
    console.log('Debug - All schools:', allSchools);
    if (debugError) {
      console.error('Debug error:', debugError);
    }
    
    // Get school details including license_id and name
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('name, license_id')
      .eq('id', schoolId)
      .maybeSingle();
    
    if (schoolError) {
      console.error('Error fetching school:', schoolError);
      return null;
    }
    
    if (!schoolData) {
      console.log('No school data found for ID:', schoolId);
      // Return fallback data so the widget doesn't break
      return {
        id: 'fallback',
        license_number: 'No License Key',
        is_active: false,
        duration_days: 0,
        days_remaining: 0,
        expires_at: null,
        school_name: 'Your School'
      };
    }
    
    console.log('School data found:', schoolData);
    
    if (!schoolData.license_id) {
      console.log('No license ID found for school, using fallback data');
      return {
        id: 'no-license',
        license_number: 'No License Key',
        is_active: false,
        duration_days: 0,
        days_remaining: 0,
        expires_at: null,
        school_name: schoolData.name
      };
    }
    
    // Get license details
    const { data: licenseData, error: licenseError } = await supabase
      .from('licenses')
      .select('id, license_key, expires_at, duration_days, created_at')
      .eq('id', schoolData.license_id)
      .maybeSingle();
    
    if (licenseError) {
      console.error('Error fetching license:', licenseError);
      return null;
    }
    
    if (!licenseData) {
      console.log('No license data found for license ID:', schoolData.license_id);
      return null;
    }
    
    console.log('License data found:', licenseData);
    
    // Calculate days remaining more accurately
    const now = new Date();
    const expiryDate = licenseData.expires_at ? new Date(licenseData.expires_at) : null;
    const createdDate = licenseData.created_at ? new Date(licenseData.created_at) : null;
    const durationDays = licenseData.duration_days || 365;
    
    let daysRemaining = 0;
    let isActive = false;
    
    if (expiryDate) {
      // If we have an expiry date, calculate from that
      daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      isActive = expiryDate > now;
    } else if (createdDate) {
      // If no expiry date but we have created date, calculate from creation
      const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, durationDays - daysSinceCreation);
      isActive = daysSinceCreation < durationDays;
    } else {
      // Fallback: assume it's a new license with full duration
      daysRemaining = durationDays;
      isActive = true;
    }
    
    console.log('Calculated days remaining:', daysRemaining, 'Active:', isActive);
    
    return {
      id: licenseData.id,
      license_number: licenseData.license_key,
      is_active: isActive,
      duration_days: durationDays,
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
  const location = useLocation();
  const isSchoolSetupPage = location.pathname === '/school-setup';
  const isLicensePage = location.pathname === '/license';
  
  // Only run the query if we're not on the school setup page
  const { data: licenseDetails, isLoading, error, refetch, isError } = useQuery({
    queryKey: ['licenseDetails'],
    queryFn: fetchLicenseDetails,
    enabled: !isSchoolSetupPage && !!localStorage.getItem('user'), // Don't run on setup page
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry failed requests 3 times
  });

  // Show a different version of the widget on the school setup page
  if (isSchoolSetupPage) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">License Status</h2>
          <Clock className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">Enter your license key to activate your subscription.</p>
        <div className="mt-3 text-sm text-blue-600">
          Your license provides access to all features based on your subscription plan.
        </div>
      </div>
    );
  }

  // Expanded view for the license management page
  if (isLicensePage && licenseDetails) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 w-full">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">License Key</h3>
            <p className="font-mono bg-gray-50 p-2 rounded mt-1 text-sm border border-gray-100">
              {licenseDetails.license_number}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <div className={`flex items-center mt-1 ${licenseDetails.is_active ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full mr-2 ${licenseDetails.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p className="font-medium">{licenseDetails.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Expiration Date</h3>
            <p className="font-medium mt-1">
              {licenseDetails.expires_at 
                ? new Date(licenseDetails.expires_at).toLocaleDateString() 
                : 'Not set'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Time Remaining</h3>
            <p className={`font-medium mt-1 ${
              licenseDetails.days_remaining > 30 
                ? 'text-green-600' 
                : licenseDetails.days_remaining > 7 
                  ? 'text-amber-600' 
                  : 'text-red-600'
            }`}>
              {licenseDetails.days_remaining} days
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">License Duration</h3>
            <p className="font-medium mt-1">{licenseDetails.duration_days} days</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">School</h3>
            <p className="font-medium mt-1">{licenseDetails.school_name}</p>
          </div>
        </div>
      </div>
    );
  }

  // If we're on the license page but loading or have error
  if (isLicensePage && (isLoading || isError)) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 w-full h-56">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-gray-500">Loading license information...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Alert variant="destructive" className="w-full bg-red-50 border-red-200">
              <AlertTitle className="text-red-600">License information unavailable</AlertTitle>
              <AlertDescription className="text-red-500">
                There was a problem loading your license details. This might be because your school setup is incomplete.
              </AlertDescription>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </Alert>
          </div>
        )}
      </div>
    );
  }

  // Standard widget view for other pages
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
      ) : error || !licenseDetails ? (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-600">License information unavailable</AlertTitle>
          <AlertDescription className="text-red-500">
            Please refresh the page or contact support if this issue persists.
          </AlertDescription>
          <Button 
            variant="outline" 
            size="sm"
            className="mt-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </Alert>
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
