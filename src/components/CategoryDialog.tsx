
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  color: string;
  parent_id: string | null;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  parentCategory?: Category;
  mode: 'add' | 'edit';
  onSuccess: () => void;
}

const CategoryDialog = ({ open, onOpenChange, category, parentCategory, mode, onSuccess }: CategoryDialogProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [color, setColor] = useState('#EF4444');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
  ];

  useEffect(() => {
    if (mode === 'edit' && category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
    } else if (mode === 'add') {
      setName('');
      setType('expense');
      setColor('#EF4444');
      
      // If adding a subcategory, inherit parent's type
      if (parentCategory) {
        setType(parentCategory.type);
      }
    }
  }, [mode, category, parentCategory, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    // Get school ID from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      toast.error('User not authenticated');
      return;
    }

    const user = JSON.parse(userData);
    const schoolId = user.schoolId;

    if (!schoolId) {
      toast.error('No school ID found. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'add') {
        console.log('Creating category:', {
          school_id: schoolId,
          name: name.trim(),
          type,
          color,
          parent_id: parentCategory?.id || null
        });

        const { data, error } = await supabase.rpc('create_category', {
          p_school_id: schoolId,
          p_name: name.trim(),
          p_type: type,
          p_color: color,
          p_parent_id: parentCategory?.id || null
        });

        if (error) {
          console.error('Error creating category:', error);
          throw error;
        }

        console.log('Category created successfully:', data);
        toast.success('Category created successfully');
      } else {
        console.log('Updating category:', {
          id: category?.id,
          name: name.trim(),
          type,
          color
        });

        const { error } = await supabase.rpc('update_category', {
          p_category_id: category?.id,
          p_name: name.trim(),
          p_type: type,
          p_color: color
        });

        if (error) {
          console.error('Error updating category:', error);
          throw error;
        }

        console.log('Category updated successfully');
        toast.success('Category updated successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' 
              ? (parentCategory ? `Add Subcategory to "${parentCategory.name}"` : 'Add New Category')
              : 'Edit Category'
            }
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value: 'income' | 'expense' | 'transfer') => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded border-2 ${
                    color === colorOption ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (mode === 'add' ? 'Create Category' : 'Update Category')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
