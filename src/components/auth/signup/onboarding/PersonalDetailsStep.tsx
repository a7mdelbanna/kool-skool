
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User, Image as ImageIcon, Phone, MessagesSquare, Instagram, Camera, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Personal details form schema
const personalDetailsSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  profilePicture: z.string().optional().nullable(),
  phone: z.string().min(5, { message: "Phone number is required" }),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
});

type PersonalDetailsFormValues = z.infer<typeof personalDetailsSchema>;

interface PersonalDetailsStepProps {
  data: {
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    phone: string;
    telegram: string;
    whatsapp: string;
    instagram: string;
  };
  updateData: (data: Partial<PersonalDetailsFormValues>) => void;
  onNext: () => void;
  loading: boolean;
}

const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({ 
  data, 
  updateData, 
  onNext,
  loading 
}) => {
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(data.profilePicture);
  
  const form = useForm<PersonalDetailsFormValues>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      profilePicture: data.profilePicture || "",
      phone: data.phone || "",
      telegram: data.telegram || "",
      whatsapp: data.whatsapp || "",
      instagram: data.instagram || "",
    },
  });

  const handleSubmit = (values: PersonalDetailsFormValues) => {
    updateData(values);
    onNext();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setUploading(true);
      
      // Create a preview for immediate feedback
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { data: uploadData, error } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);
      
      const publicUrl = publicUrlData.publicUrl;
      
      // Update form value
      form.setValue('profilePicture', publicUrl);
      updateData({ profilePicture: publicUrl });
      
      toast.success('Profile picture uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    const first = form.watch('firstName') || '';
    const last = form.watch('lastName') || '';
    return first.charAt(0).toUpperCase() + last.charAt(0).toUpperCase();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Personal Details</h2>
          <p className="text-sm text-muted-foreground">
            Tell us a bit about yourself
          </p>
        </div>

        {/* Profile Picture Upload */}
        <div className="flex flex-col items-center mb-6">
          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-center block">Profile Picture</FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-24 w-24 border-2 border-muted">
                      <AvatarImage src={imagePreview || ""} alt="Profile" />
                      <AvatarFallback className="text-xl bg-primary/10">
                        {getInitials() || <User />}
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
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Photo
                      </Button>
                      
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImagePreview(null);
                            form.setValue('profilePicture', null);
                            updateData({ profilePicture: null });
                          }}
                          disabled={uploading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <input {...field} type="hidden" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="Enter your first name" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="Enter your last name" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number *</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                  <Input placeholder="Enter your phone number" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="telegram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telegram</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <MessagesSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="Your Telegram handle" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <MessagesSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="Your WhatsApp number" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Instagram className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Input placeholder="Your Instagram handle" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PersonalDetailsStep;
