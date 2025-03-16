
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

const SubscriptionInfo = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }
      
      if (!profileData || !profileData.school_id) {
        console.log("No school associated with this user");
        setLicenseInfo(null);
        setIsLoading(false);
        return;
      }
      
      // Get school info with license details
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*, licenses(*)')
        .eq('id', profileData.school_id)
        .maybeSingle();
      
      if (schoolError) {
        console.error("Error fetching school:", schoolError);
        throw schoolError;
      }
      
      if (!schoolData || !schoolData.licenses) {
        console.log("No license information found");
        setLicenseInfo(null);
      } else {
        const licenseData = schoolData.licenses;
        
        // Calculate days remaining
        let daysRemaining = 0;
        let status = "inactive";
        
        if (licenseData.expires_at) {
          const expiryDate = new Date(licenseData.expires_at);
          const currentDate = new Date();
          
          // Calculate difference in milliseconds
          const differenceMs = expiryDate.getTime() - currentDate.getTime();
          
          // Convert to days
          daysRemaining = Math.max(0, Math.floor(differenceMs / (1000 * 60 * 60 * 24)));
          
          if (daysRemaining > 0 && licenseData.is_active) {
            status = "active";
          } else {
            status = "expired";
          }
        }
        
        // Set enhanced license info
        setLicenseInfo({
          ...licenseData,
          daysRemaining,
          status,
          totalDays: licenseData.duration_days,
          progressPercentage: Math.max(0, Math.min(100, (daysRemaining / licenseData.duration_days) * 100))
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
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
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
          <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200 mt-4">
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
