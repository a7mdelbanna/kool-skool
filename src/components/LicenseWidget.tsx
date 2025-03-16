
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
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
      } catch (error) {
        console.error('Error fetching license details:', error);
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

  const getLicenseStatusColor = () => {
    if (!licenseDetails) return "bg-gray-100";
    
    if (!licenseDetails.is_active) return "bg-red-50";
    
    if (licenseDetails.days_remaining <= 7) return "bg-amber-50";
    
    return "bg-green-50";
  };

  const getLicenseIcon = () => {
    if (!licenseDetails) return <Clock className="h-6 w-6 text-gray-400" />;
    
    if (!licenseDetails.is_active) return <AlertTriangle className="h-6 w-6 text-red-500" />;
    
    if (licenseDetails.days_remaining <= 7) return <Timer className="h-6 w-6 text-amber-500" />;
    
    return <CheckCircle className="h-6 w-6 text-green-500" />;
  };

  const getLicenseText = () => {
    if (!licenseDetails) return "Loading license information...";
    
    if (!licenseDetails.is_active) return "License is inactive";
    
    if (licenseDetails.days_remaining <= 0) return "License has expired";
    
    if (licenseDetails.days_remaining === 1) return "1 day remaining";
    
    return `${licenseDetails.days_remaining} days remaining`;
  };

  return (
    <Card className={`${getLicenseStatusColor()} border-0 shadow-sm`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">License Status</CardTitle>
          {getLicenseIcon()}
        </div>
        <CardDescription>
          {licenseDetails?.license_number && `License: ${licenseDetails.license_number}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-12">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : licenseDetails ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {licenseDetails.expires_at 
                  ? `Expires on: ${new Date(licenseDetails.expires_at).toLocaleDateString()}`
                  : 'No expiration date set'}
              </span>
            </div>
            <Alert className={`border-0 ${
              licenseDetails.days_remaining <= 7 
                ? 'bg-amber-100' 
                : licenseDetails.is_active 
                  ? 'bg-green-100' 
                  : 'bg-red-100'
            }`}>
              <AlertTitle className="flex items-center gap-2">
                {getLicenseText()}
              </AlertTitle>
              {licenseDetails.days_remaining <= 7 && licenseDetails.is_active && (
                <AlertDescription>
                  Your license will expire soon. Please consider renewing.
                </AlertDescription>
              )}
            </Alert>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Error loading license information</AlertTitle>
            <AlertDescription>
              Please refresh the page or contact support if this issue persists.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      {licenseDetails && licenseDetails.days_remaining <= 30 && licenseDetails.is_active && (
        <CardFooter>
          <Button variant="outline" className="w-full">
            Renew License
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default LicenseWidget;
