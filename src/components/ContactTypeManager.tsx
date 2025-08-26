
import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit, Trash2, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getSchoolContactTypes, createContactType, updateContactType, deleteContactType } from '@/integrations/supabase/client';
import { UserContext } from '@/App';

interface ContactType {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

interface ContactTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ContactTypeManager = ({ open, onOpenChange, onSuccess }: ContactTypeManagerProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    contactType?: ContactType;
  }>({ open: false, mode: 'add' });
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6'
  });

  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ];

  const fetchContactTypes = async () => {
    if (!user?.schoolId) return;

    try {
      setLoading(true);
      const types = await getSchoolContactTypes(user.schoolId);
      setContactTypes(types || []);
    } catch (error) {
      console.error('Error fetching contact types:', error);
      toast({
        title: "Error",
        description: "Failed to load contact types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchContactTypes();
    }
  }, [open, user?.schoolId]);

  const handleAddContactType = () => {
    setFormData({ name: '', color: '#3B82F6' });
    setEditDialog({ open: true, mode: 'add' });
  };

  const handleEditContactType = (contactType: ContactType) => {
    setFormData({ name: contactType.name, color: contactType.color });
    setEditDialog({ open: true, mode: 'edit', contactType });
  };

  const handleSaveContactType = async () => {
    if (!user?.schoolId || !formData.name.trim()) return;

    try {
      setLoading(true);
      
      if (editDialog.mode === 'add') {
        await createContactType(user.schoolId, formData.name.trim(), formData.color);
        toast({
          title: "Success",
          description: "Contact type created successfully",
        });
      } else if (editDialog.contactType) {
        await updateContactType(editDialog.contactType.id, formData.name.trim(), formData.color);
        toast({
          title: "Success",
          description: "Contact type updated successfully",
        });
      }

      setEditDialog({ open: false, mode: 'add' });
      fetchContactTypes();
      onSuccess();
    } catch (error) {
      console.error('Error saving contact type:', error);
      toast({
        title: "Error",
        description: "Failed to save contact type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContactType = async (contactType: ContactType) => {
    if (!confirm(`Are you sure you want to delete "${contactType.name}"?`)) return;

    try {
      setLoading(true);
      await deleteContactType(contactType.id);
      toast({
        title: "Success",
        description: "Contact type deleted successfully",
      });
      fetchContactTypes();
      onSuccess();
    } catch (error) {
      console.error('Error deleting contact type:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Contact Types</DialogTitle>
            <DialogDescription>
              Create and manage contact types for your business
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Contact Types</h3>
              <Button onClick={handleAddContactType} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Type
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {contactTypes.map((type) => (
                  <Card key={type.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          style={{
                            backgroundColor: `${type.color}20`,
                            color: type.color,
                            borderColor: type.color
                          }}
                        >
                          {type.name}
                        </Badge>
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContactType(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContactType(type)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {contactTypes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No contact types created yet. Click "Add Type" to get started.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Type Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editDialog.mode === 'add' ? 'Add Contact Type' : 'Edit Contact Type'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.mode === 'add' 
                ? 'Create a new contact type for your business'
                : 'Update the contact type information'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Type Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Client, Vendor, Partner"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Badge 
                  variant="secondary" 
                  style={{
                    backgroundColor: `${formData.color}20`,
                    color: formData.color,
                    borderColor: formData.color
                  }}
                >
                  {formData.name || 'Preview'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialog({ open: false, mode: 'add' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveContactType} 
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Saving...' : (editDialog.mode === 'add' ? 'Create Type' : 'Update Type')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactTypeManager;
