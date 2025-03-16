
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Building2, Upload, Phone, MessagesSquare, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

// School details form schema
const schoolDetailsSchema = z.object({
  schoolName: z.string().optional(),
  schoolPhone: z.string().optional(),
  schoolTelegram: z.string().optional(),
  schoolWhatsapp: z.string().optional(),
  schoolInstagram: z.string().optional(),
});

type SchoolDetailsFormValues = z.infer<typeof schoolDetailsSchema>;

interface SchoolDetailsStepProps {
  data: {
    schoolName: string;
    schoolLogo: string | null;
    schoolPhone: string;
    schoolTelegram: string;
    schoolWhatsapp: string;
    schoolInstagram: string;
  };
  updateData: (data: Partial<{
    schoolName: string;
    schoolLogo: string | null;
    schoolPhone: string;
    schoolTelegram: string;
    schoolWhatsapp: string;
    schoolInstagram: string;
  }>) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  loading: boolean;
}

const SchoolDetailsStep: React.FC<SchoolDetailsStepProps> = ({ 
  data, 
  updateData, 
  onNext,
  onPrev,
  onSkip,
  loading 
}) => {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(data.schoolLogo);
  const { user } = useAuth();
  
  const form = useForm<SchoolDetailsFormValues>({
    resolver: zodResolver(schoolDetailsSchema),
    defaultValues: {
      schoolName: data.schoolName || "",
      schoolPhone: data.schoolPhone || "",
      schoolTelegram: data.schoolTelegram || "",
      schoolWhatsapp: data.schoolWhatsapp || "",
      schoolInstagram: data.schoolInstagram || "",
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      setUploading(true);
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('school_logos')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('school_logos')
        .getPublicUrl(filePath);
        
      const publicUrl = publicUrlData.publicUrl;
      
      // Update logo preview
      setLogoPreview(publicUrl);
      
      // Update form data
      updateData({ schoolLogo: publicUrl });
      
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values: SchoolDetailsFormValues) => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setSaving(true);
      
      // Include logo in the update
      const schoolData = {
        ...values,
        schoolLogo: logoPreview,
      };
      
      // Get the user's school ID first
      const { data: profileData, error: profileError } = await supabase.rpc(
        'get_user_school_id',
        {
          user_id_param: user.id
        }
      );
      
      if (profileError) {
        throw profileError;
      }
      
      if (!profileData || !Array.isArray(profileData) || profileData.length === 0) {
        throw new Error("No school associated with this account");
      }
      
      const schoolId = profileData[0]?.school_id;
      
      if (!schoolId) {
        throw new Error("No school ID found in profile");
      }
      
      // Update school in database
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          name: values.schoolName || "My School",
          logo: logoPreview,
          phone: values.schoolPhone || null,
          telegram: values.schoolTelegram || null,
          whatsapp: values.schoolWhatsapp || null,
          instagram: values.schoolInstagram || null
        })
        .eq('id', schoolId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Update data in the onboarding state
      updateData(schoolData);
      toast.success("School details saved successfully");
      
      // Proceed to next step
      onNext();
    } catch (error: any) {
      console.error("Error saving school details:", error);
      toast.error(error.message || "Failed to save school details");
    } finally {
      setSaving(false);
    }
  };

  // Get first letter of school name for avatar fallback
  const getSchoolInitial = () => {
    const schoolName = form.watch('schoolName') || '';
    return schoolName.charAt(0).toUpperCase() || 'S';
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">School Information</h2>
          <p className="text-sm text-muted-foreground">
            Tell us about your school (optional)
          </p>
        </div>

        <FormField
          control={form.control}
          name="schoolName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Name</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <Input placeholder="Enter your school name" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>School Logo</FormLabel>
          <FormControl>
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 border-2 border-muted mb-4">
                <AvatarImage src={logoPreview || ""} alt="School Logo" />
                <AvatarFallback className="text-xl bg-primary/10">
                  {getSchoolInitial()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="relative"
                  disabled={uploading}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Logo
                </Button>
                
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoPreview(null);
                      updateData({ schoolLogo: null });
                    }}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="schoolPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Phone</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                  <Input placeholder="Enter school phone number" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="schoolTelegram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Telegram</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <MessagesSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="School Telegram handle" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="schoolWhatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School WhatsApp</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <MessagesSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="School WhatsApp number" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="schoolInstagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Instagram</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Instagram className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="School Instagram handle" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between pt-4 space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev}
            disabled={loading || uploading || saving}
          >
            Back
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onSkip}
              disabled={loading || uploading || saving}
            >
              Skip
            </Button>
            
            <Button 
              type="submit" 
              disabled={loading || uploading || saving}
            >
              {loading || uploading || saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading..." : saving ? "Saving..." : "Loading..."}
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default SchoolDetailsStep;
