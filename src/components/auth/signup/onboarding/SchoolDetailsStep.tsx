import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Building2, Image, Phone, MessagesSquare, Instagram } from "lucide-react";

// School details form schema
const schoolDetailsSchema = z.object({
  schoolName: z.string().optional(),
  schoolLogo: z.string().optional().nullable(),
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
  updateData: (data: Partial<SchoolDetailsFormValues>) => void;
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
  const form = useForm<SchoolDetailsFormValues>({
    resolver: zodResolver(schoolDetailsSchema),
    defaultValues: {
      schoolName: data.schoolName || "",
      schoolLogo: data.schoolLogo || "",
      schoolPhone: data.schoolPhone || "",
      schoolTelegram: data.schoolTelegram || "",
      schoolWhatsapp: data.schoolWhatsapp || "",
      schoolInstagram: data.schoolInstagram || "",
    },
  });

  const handleSubmit = (values: SchoolDetailsFormValues) => {
    updateData(values);
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

        <FormField
          control={form.control}
          name="schoolLogo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Logo</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <Image className="w-4 h-4 mr-2 text-muted-foreground" />
                  <Input 
                    placeholder="URL to your school logo" 
                    {...field} 
                    value={field.value || ""} 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            disabled={loading}
          >
            Back
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onSkip}
              disabled={loading}
            >
              Skip
            </Button>
            
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
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
