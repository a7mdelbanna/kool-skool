import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const generateLicenseNumber = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const licenseSchema = z.object({
  licenseNumber: z.string().length(16, { message: "License number must be exactly 16 characters" }),
  durationDays: z.number().int().positive({ message: "Duration must be a positive number" }),
  schoolName: z.string().min(2, { message: "School name is required" }),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

const LicenseManager = () => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null);
  const { user } = useAuth();
  
  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: generateLicenseNumber(),
      durationDays: 30,
      schoolName: "",
    },
  });

  const fetchLicenses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setLicenses(data || []);
    } catch (error: any) {
      toast.error(`Error fetching licenses: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const onSubmit = async (data: LicenseFormValues) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.from('licenses').insert({
        license_number: data.licenseNumber,
        duration_days: data.durationDays,
        school_name: data.schoolName,
        is_active: true
      });

      if (error) {
        throw error;
      }

      toast.success("License created successfully");
      setIsDialogOpen(false);
      form.reset({
        licenseNumber: generateLicenseNumber(),
        durationDays: 30,
        schoolName: "",
      });
      fetchLicenses();
    } catch (error: any) {
      toast.error(`Error creating license: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLicense = async () => {
    if (!selectedLicense) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', selectedLicense);

      if (error) {
        throw error;
      }

      toast.success("License deleted successfully");
      setSelectedLicense(null);
      fetchLicenses();
    } catch (error: any) {
      toast.error(`Error deleting license: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateLicenseNumber = () => {
    form.setValue("licenseNumber", generateLicenseNumber());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>License Management</CardTitle>
            <CardDescription>Create and manage license keys for schools</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New License
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New License</DialogTitle>
                <DialogDescription>
                  Generate a license key for a new school. This will allow them to register and use the platform.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} disabled={isLoading} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={regenerateLicenseNumber}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create License"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && licenses.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No licenses found. Create your first license to get started.
                  </TableCell>
                </TableRow>
              ) : (
                licenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-medium">{license.school_name || "—"}</TableCell>
                    <TableCell className="font-mono">{license.license_number}</TableCell>
                    <TableCell>{license.duration_days} days</TableCell>
                    <TableCell>
                      {license.is_active ? (
                        license.used_by ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 hover:bg-blue-50">
                            Activated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                            Available
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {license.created_at ? format(new Date(license.created_at), 'MMM d, yyyy') : "—"}
                    </TableCell>
                    <TableCell>
                      {license.expires_at ? format(new Date(license.expires_at), 'MMM d, yyyy') : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedLicense(license.id)}
                            disabled={!!license.used_by}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the
                              license and remove it from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedLicense(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={deleteLicense} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={fetchLicenses} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LicenseManager;
