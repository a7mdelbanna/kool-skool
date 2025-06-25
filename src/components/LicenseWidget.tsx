
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
    let schoolId = user.schoolId;
    
    if (!schoolId) {
      console.error('No school ID found for user');
      return null;
    }
    
    console.log('=== LICENSE DEBUG START ===');
    console.log('User from localStorage:', user);
    console.log('Fetching license details for school ID:', schoolId);
    
    // Check if any schools exist at all
    const { data: allSchools, error: schoolsError } = await supabase
      .from('schools')
      .select('*');
    
    console.log('All schools query result:', { data: allSchools, error: schoolsError });
    
    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError);
      return {
        id: 'error-schools',
        license_number: 'Database Error',
        is_active: false,
        duration_days: 0,
        days_remaining: 0,
        expires_at: null,
        school_name: 'Error loading school data'
      };
    }
    
    // If no schools exist at all, this indicates the school setup wasn't completed
    if (!allSchools || allSchools.length === 0) {
      console.warn('No schools found in database - school setup may not be complete');
      return {
        id: 'no-schools',
        license_number: 'Setup Required',
        is_active: false,
        duration_days: 0,
        days_remaining: 0,
        expires_at: null,
        school_name: 'School Setup Required'
      };
    }
    
    // Try to find the specific school
    let schoolData = allSchools.find(school => school.id === schoolId);
    
    // If no exact match, use first school and update localStorage
    if (!schoolData) {
      console.log('School ID not found, using first available school');
      schoolData = allSchools[0];
      
      // Update localStorage with correct school ID
      const updatedUser = { ...user, schoolId: schoolData.id };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('Updated localStorage with correct school ID:', schoolData.id);
      schoolId = schoolData.id;
    }
    
    console.log('Using school data:', schoolData);
    
    // Check if school has a license
    if (!schoolData.license_id) {
      console.log('School has no license ID');
      return {
        id: 'no-license-id',
        license_number: 'No License Assigned',
        is_active: false,
        duration_days: 365,
        days_remaining: 365,
        expires_at: null,
        school_name: schoolData.name
      };
    }
    
    // Get license details
    const { data: licenseData, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', schoolData.license_id)
      .maybeSingle();
    
    console.log('License query result:', { data: licenseData, error: licenseError });
    
    if (licenseError) {
      console.error('Error fetching license:', licenseError);
      return {
        id: 'license-error',
        license_number: 'License Error',
        is_active: false,
        duration_days: 0,
        days_remaining: 0,
        expires_at: null,
        school_name: schoolData.name
      };
    }
    
    if (!licenseData) {
      console.log('No license data found for license ID:', schoolData.license_id);
      return {
        id: 'license-not-found',
        license_number: 'License Not Found',
        is_active: false,
        duration_days: 365,
        days_remaining: 0,
        expires_at: null,
        school_name: schoolData.name
      };
    }
    
    // Calculate days remaining
    const now = new Date();
    const expiryDate = licenseData.expires_at ? new Date(licenseData.expires_at) : null;
    const createdDate = licenseData.created_at ? new Date(licenseData.created_at) : null;
    const durationDays = licenseData.duration_days || 365;
    
    let daysRemaining = 0;
    let isActive = licenseData.is_active || false;
    
    if (expiryDate) {
      daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      isActive = expiryDate > now && licenseData.is_active;
    } else if (createdDate && licenseData.is_active) {
      const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, durationDays - daysSinceCreation);
      isActive = daysSinceCreation < durationDays && licenseData.is_active;
    } else if (licenseData.is_active) {
      daysRemaining = durationDays;
      isActive = true;
    }
    
    const result = {
      id: licenseData.id,
      license_number: licenseData.license_key,
      is_active: isActive,
      duration_days: durationDays,
      days_remaining: daysRemaining,
      expires_at: licenseData.expires_at,
      school_name: schoolData.name
    };
    
    console.log('Final license result:', result);
    console.log('=== LICENSE DEBUG END ===');
    
    return result;
  } catch (error) {
    console.error('Error in fetchLicenseDetails:', error);
    return {
      id: 'catch-error',
      license_number: 'System Error',
      is_active: false,
      duration_days: 0,
      days_remaining: 0,
      expires_at: null,
      school_name: 'Error loading data'
    };
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
    enabled: !isSchoolSetupPage && !!localStorage.getItem('user'),
    staleTime: 5 * 60 * 1000,
    retry: 1, // Reduce retries to avoid spam
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
    // Show specific message for setup required case
    if (licenseDetails.id === 'no-schools') {
      return (
        <div className="bg-white p-6 rounded-lg border border-amber-200 w-full">
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertTitle className="text-amber-700">School Setup Required</AlertTitle>
            <AlertDescription className="text-amber-600 space-y-2">
              <p>It looks like your school hasn't been set up in the system yet.</p>
              <p>To get started, you'll need to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Complete the school setup process</li>
                <li>Enter your license key</li>
                <li>Verify your school information</li>
              </ul>
            </AlertDescription>
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/school-setup'}
              >
                Go to School Setup
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

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
