import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Calendar, Users, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LicenseInfo {
  id: string;
  license_number: string;
  is_active: boolean;
  duration_days: number;
  max_users: number;
  created_at: string;
  expires_at: string;
  days_remaining: number;
  school_name: string;
  school_id: string;
  status?: string;
  daysRemaining?: number;
  progressPercentage?: number;
}

interface SchoolData {
  id: string;
  name: string;
  license_id: string;
  [key: string]: any;
}

const SubscriptionInfo = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLicenseInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // First, get the user's school_id
      const { data: schoolId, error: schoolIdError } = await supabase
        .rpc('get_user_school_id');
      
      if (schoolIdError) {
        console.error("Error fetching school ID:", schoolIdError);
        throw schoolIdError;
      }
      
      if (!schoolId) {
        console.log("No school associated with this user");
        setLicenseInfo(null);
        setIsLoading(false);
        return;
      }
      
      // Get school info
      const { data: schoolData, error: schoolError } = await supabase
        .rpc('get_school_info', { school_id_param: schoolId });
      
      if (schoolError) {
        console.error("Error fetching school:", schoolError);
        throw schoolError;
      }
      
      // Type assertion and validation for schoolData
      if (!schoolData || !Array.isArray(schoolData) || schoolData.length === 0) {
        console.log("No school information found");
        setLicenseInfo(null);
        setIsLoading(false);
        return;
      }
      
      // Type assertion to ensure SchoolData type
      const schoolInfo = schoolData[0] as unknown as SchoolData;
      
      if (!schoolInfo.license_id) {
        console.log("No license information found for this school");
        setLicenseInfo(null);
        setIsLoading(false);
        return;
      }
      
      // Get license details
      const { data: licenseData, error: licenseError } = await supabase
        .rpc('get_license_details', { license_id_param: schoolInfo.license_id });
      
      if (licenseError) {
        console.error("Error fetching license details:", licenseError);
        throw licenseError;
      }
      
      if (!licenseData || !Array.isArray(licenseData) || licenseData.length === 0) {
        console.log("License information not found");
        setLicenseInfo(null);
      } else {
        // Use type assertion to ensure LicenseInfo type
        const license = licenseData[0] as unknown as LicenseInfo;
        
        // Calculate status
        let status = "inactive";
        if (license.is_active && license.days_remaining > 0) {
          status = "active";
        } else if (license.days_remaining <= 0) {
          status = "expired";
        }
        
        // Set enhanced license info
        setLicenseInfo({
          ...license,
          status,
          daysRemaining: Math.max(0, license.days_remaining),
          progressPercentage: Math.max(0, Math.min(100, (license.days_remaining / license.duration_days) * 100))
        });
      }
    } catch (err: any) {
      console.error("Error fetching license info:", err);
      setError(err.message || "Failed to load subscription information");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLicenseInfo();
    }
  }, [user]);

  const handleRefresh = () => {
    fetchLicenseInfo();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Your current license information</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Your current license information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleRefresh}>Retry</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!licenseInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Your current license information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-amber-50 text-amber-800 border-amber-200">
            <Info className="h-4 w-4" />
            <AlertTitle>No License Found</AlertTitle>
            <AlertDescription>
              No subscription information was found for your account. Please contact support if you believe this is an error.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current license information</CardDescription>
          </div>
          <Badge 
            variant={licenseInfo.status === "active" ? "outline" : "destructive"}
            className={
              licenseInfo.status === "active" 
                ? "bg-green-50 text-green-700 hover:bg-green-50" 
                : ""
            }
          >
            {licenseInfo.status === "active" ? "Active" : "Expired"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time Remaining</span>
            <span className="font-medium">
              {licenseInfo.daysRemaining} {licenseInfo.daysRemaining === 1 ? "day" : "days"}
            </span>
          </div>
          <Progress value={licenseInfo.progressPercentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p className="text-sm text-muted-foreground">{licenseInfo.duration_days} days</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Maximum Users</p>
              <p className="text-sm text-muted-foreground">{licenseInfo.max_users || "Unlimited"}</p>
            </div>
          </div>
        </div>
        
        {licenseInfo.daysRemaining < 14 && licenseInfo.status === "active" && (
          <Alert variant="default" className="bg-amber-50 text-amber-800 border-amber-200 mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Expiring Soon</AlertTitle>
            <AlertDescription>
              Your subscription will expire in {licenseInfo.daysRemaining} days. Please contact support to renew.
            </AlertDescription>
          </Alert>
        )}
        
        {licenseInfo.status === "expired" && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Expired</AlertTitle>
            <AlertDescription>
              Your subscription has expired. Please contact support to renew your license.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={handleRefresh} className="w-full">
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionInfo;
