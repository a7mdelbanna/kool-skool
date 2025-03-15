
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";

const SubscriptionInfo = () => {
  const [license, setLicense] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchSubscriptionInfo = async () => {
    try {
      setIsLoading(true);

      // First get the user's school ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData?.school_id) {
        toast.error("No school associated with this account");
        setIsLoading(false);
        return;
      }

      // Get school info
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*, licenses(*)')
        .eq('id', profileData.school_id)
        .single();

      if (schoolError) throw schoolError;
      
      setSchool(schoolData);
      
      if (schoolData.license_id) {
        const { data: licenseData, error: licenseError } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', schoolData.license_id)
          .single();
          
        if (licenseError) throw licenseError;
        setLicense(licenseData);
      }
    } catch (error: any) {
      toast.error(`Error fetching subscription info: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionInfo();
    }
  }, [user]);

  const getRemainingDays = () => {
    if (!license?.expires_at) return 0;
    const expiryDate = new Date(license.expires_at);
    const today = new Date();
    return Math.max(0, differenceInCalendarDays(expiryDate, today));
  };

  const getStatusBadge = () => {
    if (!license) return null;
    
    const remainingDays = getRemainingDays();
    
    if (remainingDays <= 0) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
          Expired
        </Badge>
      );
    } else if (remainingDays <= 7) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-600 hover:bg-amber-50">
          Expiring Soon
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
          Active
        </Badge>
      );
    }
  };

  const getSchoolInitials = () => {
    if (!school?.name) return "S";
    return school.name.split(" ")
      .map((word: string) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Information</CardTitle>
          <CardDescription>Loading your school's subscription details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Information</CardTitle>
        <CardDescription>
          View your current school subscription status and details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!license ? (
          <div className="text-center py-8 text-muted-foreground">
            No active subscription found. Please contact support for assistance.
          </div>
        ) : (
          <div className="space-y-6">
            {/* School Profile with Logo */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={school?.logo || ""} alt={school?.name} />
                <AvatarFallback className="text-lg bg-primary/10">
                  {getSchoolInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{school?.name || "School"}</h3>
                <p className="text-sm text-muted-foreground">
                  {license?.license_number}
                </p>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-muted/20">
                <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                <div className="flex items-center">
                  {getStatusBadge()}
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-muted/20">
                <div className="text-sm font-medium text-muted-foreground mb-1">Expiry Date</div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{license?.expires_at ? format(new Date(license.expires_at), 'MMM d, yyyy') : "N/A"}</span>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-muted/20">
                <div className="text-sm font-medium text-muted-foreground mb-1">Days Remaining</div>
                <div className="font-medium text-lg">
                  {getRemainingDays()} days
                </div>
                <div className="mt-1 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getRemainingDays() <= 7 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ 
                      width: `${Math.min(100, (getRemainingDays() / license?.duration_days) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Contact Support Note */}
            <div className="mt-6 text-sm text-muted-foreground">
              <p>Need to renew or upgrade your license? Please contact your administrator or support.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionInfo;
