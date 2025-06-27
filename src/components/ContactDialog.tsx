
import React, { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase, getSchoolContactTypes } from '@/integrations/supabase/client';
import { UserContext } from '@/App';

interface Contact {
  id?: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface ContactType {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  mode: 'add' | 'edit';
  onSuccess: () => void;
}

const ContactDialog = ({ open, onOpenChange, contact, mode, onSuccess }: ContactDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
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
        type: '',
        email: '',
        phone: '',
        notes: ''
      });
    }
  }, [contact, mode, open]);

  useEffect(() => {
    const fetchContactTypes = async () => {
      if (!user?.schoolId || !open) return;

      try {
        setLoadingTypes(true);
        const types = await getSchoolContactTypes(user.schoolId);
        setContactTypes(types || []);
        
        // Set default type if adding and no type selected
        if (mode === 'add' && !formData.type && types && types.length > 0) {
          setFormData(prev => ({ ...prev, type: types[0].name }));
        }
      } catch (error) {
        console.error('Error fetching contact types:', error);
        toast({
          title: "Error",
          description: "Failed to load contact types",
          variant: "destructive",
        });
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchContactTypes();
  }, [user?.schoolId, open, mode]);

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
            {loadingTypes ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Button type="submit" disabled={loading || loadingTypes}>
              {loading ? 'Saving...' : (mode === 'add' ? 'Create Contact' : 'Update Contact')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
