
import React, { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';

interface Contact {
  id?: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  mode: 'add' | 'edit';
  onSuccess: () => void;
}

const CONTACT_TYPES = [
  'Client',
  'Vendor', 
  'Service Provider',
  'Partner',
  'Supplier',
  'Contractor'
];

const ContactDialog = ({ open, onOpenChange, contact, mode, onSuccess }: ContactDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Client',
    email: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    if (contact && mode === 'edit') {
      setFormData({
        name: contact.name,
        type: contact.type,
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || ''
      });
    } else if (mode === 'add') {
      setFormData({
        name: '',
        type: 'Client',
        email: '',
        phone: '',
        notes: ''
      });
    }
  }, [contact, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      if (mode === 'add') {
        const { error } = await supabase
          .from('contacts')
          .insert({
            school_id: user.schoolId,
            name: formData.name,
            type: formData.type,
            email: formData.email || null,
            phone: formData.phone || null,
            notes: formData.notes || null
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Contact created successfully",
        });
      } else {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: formData.name,
            type: formData.type,
            email: formData.email || null,
            phone: formData.phone || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', contact?.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Contact updated successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Contact' : 'Edit Contact'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Create a new contact for your business network'
              : 'Update contact information'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Contact Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., ABC Marketing Agency"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Contact Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="contact@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional information about this contact..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (mode === 'add' ? 'Create Contact' : 'Update Contact')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
