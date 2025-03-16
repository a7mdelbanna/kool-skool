
import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, School } from "lucide-react";
import SubscriptionInfo from "@/components/school-setup/SubscriptionInfo";
import LicenseManager from "@/components/school-setup/LicenseManager";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { PlusCircle } from "lucide-react";

const schoolSchema = z.object({
  name: z.string().min(1, { message: "School name is required" }),
  license_number: z.string().min(1, { message: "License number is required" }),
});

type SchoolFormValues = z.infer<typeof schoolSchema>;

const SchoolSetup = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noSchoolFound, setNoSchoolFound] = useState(false);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  
  const schoolForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      license_number: "",
    },
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Use RPC function to get role safely
          const { data: roleData, error: roleError } = await supabase
            .rpc('get_current_user_role');
            
          if (roleError) {
            console.error("Error fetching user role:", roleError);
            setError("Failed to fetch user role. Please try again.");
          } else {
            setUserRole(roleData || null);
          }
          
          // Check if the user has a school
          const { data: schoolIdData, error: schoolIdError } = await supabase
            .rpc('get_user_school_id', { user_id_param: user.id });
            
          if (schoolIdError) {
            console.error("Error checking for school:", schoolIdError);
            setError("Failed to check for school. Please try again.");
          } else {
            console.log("School ID data:", schoolIdData);
            if (!schoolIdData || schoolIdData.length === 0 || !schoolIdData[0]?.school_id) {
              setNoSchoolFound(true);
            } else {
              setNoSchoolFound(false);
            }
          }
        } catch (err) {
          console.error("Error in fetchUserRole:", err);
          setError("An unexpected error occurred. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchUserRole();
  }, [user]);

  const onSubmitSchoolForm = async (data: SchoolFormValues) => {
    setIsCreatingSchool(true);
    
    try {
      if (!user?.id) {
        toast.error("You must be logged in to create a school");
        return;
      }

      const { error } = await supabase.rpc(
        'create_school_and_update_profile_rpc',
        {
          school_name: data.name,
          license_number: data.license_number
        }
      );
      
      if (error) {
        console.error("Error creating school:", error);
        toast.error(`Error creating school: ${error.message}`);
        throw error;
      }
      
      toast.success("School created successfully!");
      schoolForm.reset();
      setSchoolDialogOpen(false);
      setNoSchoolFound(false);
      
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast.error(`Failed to create school: ${error.message}`);
    } finally {
      setIsCreatingSchool(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (noSchoolFound) {
    return (
      <div className="container py-10 space-y-6">
        <h1 className="text-3xl font-bold">School Setup</h1>
        
        <Alert className="bg-blue-50 text-blue-800 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>School Administration</AlertTitle>
          <AlertDescription>
            View your school subscription and manage staff members.
          </AlertDescription>
        </Alert>
        
        <Card className="text-center">
          <CardHeader>
            <CardTitle>No School Found</CardTitle>
            <CardDescription>
              You don't have a school associated with your account yet. 
              Create a school to manage your subscription and staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8 flex flex-col items-center">
            <School className="h-12 w-12 text-muted-foreground mb-4" />
            <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create School
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create a School</DialogTitle>
                  <DialogDescription>
                    Set up your school and connect it to your license.
                  </DialogDescription>
                </DialogHeader>
                <Form {...schoolForm}>
                  <form onSubmit={schoolForm.handleSubmit(onSubmitSchoolForm)} className="space-y-4">
                    <FormField
                      control={schoolForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter school name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={schoolForm.control}
                      name="license_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your license number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={isCreatingSchool}>
                        {isCreatingSchool ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create School
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-6">
      <h1 className="text-3xl font-bold">School Setup</h1>
      
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>School Administration</AlertTitle>
        <AlertDescription>
          View your school subscription and manage staff members.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-6">
        <SubscriptionInfo />
        
        {/* Only show license manager for admin users */}
        {userRole === 'admin' && <LicenseManager />}
      </div>
    </div>
  );
};

export default SchoolSetup;
