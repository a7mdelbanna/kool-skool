
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  schoolId: string;
}

interface ContactFormData {
  name: string;
  type: string;
  email: string;
  phone: string;
  notes: string;
}

const ContactDialog: React.FC<ContactDialogProps> = ({
  open,
  onOpenChange,
  contactId,
  schoolId,
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!contactId;

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    type: '',
    email: '',
    phone: '',
    notes: '',
  });

  // Fetch contact data for editing
  const { data: contactData } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) {
        console.error('Error fetching contact:', error);
        throw error;
      }

      return data;
    },
    enabled: !!contactId && open,
  });

  // Reset form when dialog opens/closes or contact data changes
  useEffect(() => {
    if (open) {
      if (contactData) {
        setFormData({
          name: contactData.name || '',
          type: contactData.type || '',
          email: contactData.email || '',
          phone: contactData.phone || '',
          notes: contactData.notes || '',
        });
      } else if (!isEditing) {
        setFormData({
          name: '',
          type: '',
          email: '',
          phone: '',
          notes: '',
        });
      }
    }
  }, [open, contactData, isEditing]);

  // Create/Update contact mutation
  const saveContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (isEditing && contactId) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            name: data.name,
            type: data.type,
            email: data.email || null,
            phone: data.phone || null,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);

        if (error) {
          console.error('Error updating contact:', error);
          throw error;
        }
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            school_id: schoolId,
            name: data.name,
            type: data.type,
            email: data.email || null,
            phone: data.phone || null,
            notes: data.notes || null,
          });

        if (error) {
          console.error('Error creating contact:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-contacts', schoolId] });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      }
      toast.success(isEditing ? 'Contact updated successfully' : 'Contact created successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to save contact:', error);
      toast.error('Failed to save contact: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    
    if (!formData.type) {
      toast.error('Contact type is required');
      return;
    }

    saveContactMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the contact information below.' 
              : 'Fill in the details to create a new contact.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="col-span-3"
                placeholder="Contact name"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type *
              </Label>
              <div className="col-span-3">
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="service_provider">Service Provider</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="col-span-3"
                placeholder="contact@example.com"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="col-span-3"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="col-span-3"
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saveContactMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveContactMutation.isPending}
            >
              {saveContactMutation.isPending 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Contact' : 'Create Contact')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
