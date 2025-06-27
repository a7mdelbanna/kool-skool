
import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getCurrentUserInfo } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  color: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  full_path: string;
  level: number;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  parentCategory?: Category;
  mode: 'add' | 'edit';
  onSuccess: () => void;
}

const PREDEFINED_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E'
];

const CategoryDialog = ({ 
  open, 
  onOpenChange, 
  category, 
  parentCategory, 
  mode, 
  onSuccess 
}: CategoryDialogProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [color, setColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Initialize form when dialog opens or category changes
  useEffect(() => {
    if (category && mode === 'edit') {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
    } else {
      setName('');
      setType(parentCategory?.type || 'expense');
      setColor('#3B82F6');
    }
  }, [category, parentCategory, mode, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!userInfo?.[0]?.user_school_id) {
      toast.error('No school ID found');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'add') {
        const { error } = await supabase
          .from('transaction_categories')
          .insert({
            school_id: userInfo[0].user_school_id,
            name: name.trim(),
            type,
            color,
            parent_id: parentCategory?.id || null,
          });

        if (error) throw error;
        toast.success('Category created successfully');
      } else if (category) {
        const { error } = await supabase
          .from('transaction_categories')
          .update({
            name: name.trim(),
            type,
            color,
            updated_at: new Date().toISOString(),
          })
          .eq('id', category.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      }

      onSuccess();
    } catch (error: any) {
      toast.error('Failed to save category: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Category' : 'Edit Category'}
            {parentCategory && (
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Under: {parentCategory.full_path}
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Create a new transaction category to organize your finances.' 
              : 'Update the category details.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Office Supplies"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select 
                value={type} 
                onValueChange={(value: 'income' | 'expense' | 'transfer') => setType(value)}
                disabled={!!parentCategory} // Disable if this is a subcategory
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Income
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        Expense
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="transfer">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        Transfer
                      </Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {parentCategory && (
                <p className="text-xs text-muted-foreground mt-1">
                  Subcategories inherit their parent's type
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: color }}
                />
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-8 p-1"
                />
              </div>
              <div className="grid grid-cols-8 gap-1">
                {PREDEFINED_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (mode === 'add' ? 'Create Category' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
