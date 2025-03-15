
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Building2, Image, Phone, MessagesSquare, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [logoPreview, setLogoPreview] = useState<string | null>(data.schoolLogo);
  
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

  const handleSubmit = (values: SchoolDetailsFormValues) => {
    // Include logo in the update
    updateData({
      ...values,
      schoolLogo: logoPreview,
    });
    onNext();
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
            <div className="space-y-4">
              {/* Logo preview */}
              {logoPreview && (
                <div className="flex justify-center">
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-input">
                    <img 
                      src={logoPreview} 
                      alt="School logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              {/* Upload button */}
              <div className="flex items-center justify-center">
                <label htmlFor="logo-upload" className={cn(
                  "flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md border border-input",
                  "bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                )}>
                  <Image className="w-4 h-4 text-muted-foreground" />
                  {uploading ? "Uploading..." : "Upload School Logo"}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
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
            disabled={loading || uploading}
          >
            Back
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onSkip}
              disabled={loading || uploading}
            >
              Skip
            </Button>
            
            <Button 
              type="submit" 
              disabled={loading || uploading}
            >
              {loading || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading..." : "Saving..."}
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
