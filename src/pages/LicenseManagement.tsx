
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Clock, KeyRound, CreditCard, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';
import LicenseWidget from '@/components/LicenseWidget';

interface SchoolInfo {
  id: string;
  name: string;
  contact_info: any;
  logo: string | null;
}

const fetchSchoolInfo = async (): Promise<SchoolInfo | null> => {
  try {
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
    
    console.log('Fetching school info for ID:', schoolId);
    
    // First, let's check if any schools exist at all and find the correct one
    const { data: allSchools, error: allSchoolsError } = await supabase
      .from('schools')
      .select('id, name, contact_info, logo');
    
    console.log('All schools in database:', allSchools);
    if (allSchoolsError) {
      console.error('Error fetching all schools:', allSchoolsError);
    }
    
    // Try exact match first
    let schoolData = allSchools?.find(school => school.id === schoolId);
    
    // If no exact match and we have schools, let's try to find a similar ID or use the first one
    if (!schoolData && allSchools && allSchools.length > 0) {
      console.log('No exact match found, checking for similar IDs...');
      // Look for similar IDs (in case of typos)
      schoolData = allSchools.find(school => 
        school.id.toLowerCase().includes(schoolId.toLowerCase().substring(0, 8)) ||
        schoolId.toLowerCase().includes(school.id.toLowerCase().substring(0, 8))
      );
      
      // If still no match, use the first school (assuming single school setup)
      if (!schoolData) {
        console.log('Using first available school as fallback');
        schoolData = allSchools[0];
        
        // Update localStorage with correct school ID
        const updatedUser = { ...user, schoolId: schoolData.id };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('Updated localStorage with correct school ID:', schoolData.id);
      }
    }
    
    if (!schoolData) {
      console.log('No school data found');
      return {
        id: schoolId,
        name: "Your School",
        contact_info: null,
        logo: null
      };
    }
    
    console.log('Successfully fetched school data:', schoolData);
    return {
      id: schoolData.id,
      name: schoolData.name,
      contact_info: schoolData.contact_info,
      logo: schoolData.logo
    };
  } catch (error) {
    console.error('Error in fetchSchoolInfo:', error);
    return null;
  }
};

const LicenseManagement: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: schoolInfo, isLoading: schoolLoading, error: schoolError, refetch } = useQuery({
    queryKey: ['schoolInfo'],
    queryFn: fetchSchoolInfo,
    enabled: !!localStorage.getItem('user'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry failed requests 3 times
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">License Management</h1>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>School License Information</CardTitle>
              <CardDescription>
                View your current license status and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schoolLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !schoolInfo ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-red-800">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="font-medium text-red-700">Error Loading School Information</h3>
                  </div>
                  <p className="text-sm text-red-600">
                    We couldn't retrieve your school information. This might be because your school hasn't been set up yet or there's a database issue.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <School className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="text-lg font-medium">{schoolInfo.name}</h3>
                      <p className="text-sm text-gray-500">School Account</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-5 w-5 text-primary mr-2" />
                      <h3 className="font-medium">Subscription Details</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <LicenseWidget />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      className="mr-2"
                      onClick={() => navigate('/')}
                    >
                      Back to Dashboard
                    </Button>
                    <Button 
                      onClick={() => {
                        toast({
                          title: "Feature coming soon",
                          description: "License renewal functionality will be available soon.",
                        });
                      }}
                    >
                      Renew License
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>License Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-sm">View your current license status and expiration date</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-sm">Monitor your remaining license duration</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <p className="text-sm">Manage your license key information</p>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                  <p>Need help with your license? Contact our support team for assistance.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LicenseManagement;
