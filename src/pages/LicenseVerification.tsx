
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Shield, School } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const licenseSchema = z.object({
  licenseNumber: z.string().min(1, { message: 'Please enter a license number' }),
  schoolName: z.string().min(1, { message: 'Please enter a school name' }),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

const LicenseVerification = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: '',
      schoolName: '',
    },
  });

  const onSubmit = async (data: LicenseFormValues) => {
    try {
      setLoading(true);
      
      // 1. Verify license exists and is valid
      const { data: licenseData, error: licenseError } = await supabase
        .rpc('verify_license', { license_number_param: data.licenseNumber });
      
      if (licenseError) throw licenseError;
      
      if (!licenseData || licenseData.length === 0) {
        throw new Error('Invalid license number or license has expired');
      }
      
      const license = licenseData[0];
      
      if (!license.is_active) {
        throw new Error('This license is inactive');
      }
      
      // 2. Create school and associate with current user (director)
      const { data: schoolData, error: schoolError } = await supabase
        .rpc('create_school_and_associate_director', {
          license_id_param: license.license_id,
          school_name_param: data.schoolName
        });
      
      if (schoolError) throw schoolError;
      
      toast({
        title: 'License verified',
        description: 'Your school has been created successfully',
      });
      
      // Redirect to school setup page for more details
      navigate('/school-setup');
      
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'There was an error verifying your license',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Verify License</CardTitle>
            <CardDescription className="text-center">
              Enter your license number and school name to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="licenseNumber"
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
                
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="Enter your school name" {...field} />
                          <School className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-xs text-gray-500 text-center">
              If you don't have a license number, please contact your administrator.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LicenseVerification;
