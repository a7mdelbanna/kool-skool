
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CategoryDialog from '@/components/CategoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';

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

const TransactionCategoriesManagement = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedParent, setSelectedParent] = useState<Category | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  // Fetch categories directly from Firebase
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['school-categories', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        console.log('No school ID found for categories');
        return [];
      }
      
      console.log('Fetching categories for school:', schoolId);
      
      try {
        // Fetch from Firebase
        const data = await databaseService.query('transaction_categories', {
          where: [{ field: 'school_id', operator: '==', value: schoolId }]
        });
        
        console.log('Firebase categories fetched:', data);
        
        // Filter active categories and transform data to match expected format
        return (data || [])
          .filter((cat: any) => cat.is_active !== false)
          .map((cat: any) => ({
            ...cat,
            full_path: cat.name,
            level: cat.parent_id ? 1 : 0
          }));
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        throw err;
      }
    },
    enabled: !!schoolId,
  });

  // Create default categories mutation
  const createDefaultCategories = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error('No school ID');
      
      const defaultCategories = [
        // Income categories
        { name: 'Course Sales', type: 'income', color: '#10B981', parent_id: null },
        { name: 'Consulting', type: 'income', color: '#06B6D4', parent_id: null },
        { name: 'Subscriptions', type: 'income', color: '#8B5CF6', parent_id: null },
        { name: 'Other Income', type: 'income', color: '#059669', parent_id: null },
        
        // Expense categories
        { name: 'Operating Expenses', type: 'expense', color: '#EF4444', parent_id: null },
        { name: 'Marketing', type: 'expense', color: '#F59E0B', parent_id: null },
        { name: 'Salaries', type: 'expense', color: '#EC4899', parent_id: null },
        { name: 'Software & Tools', type: 'expense', color: '#3B82F6', parent_id: null },
        { name: 'Office Supplies', type: 'expense', color: '#F97316', parent_id: null },
        { name: 'Other Expenses', type: 'expense', color: '#DC2626', parent_id: null },
        
        // Transfer category
        { name: 'Internal Transfer', type: 'transfer', color: '#6B7280', parent_id: null }
      ];
      
      // Create all default categories in Firebase
      await Promise.all(
        defaultCategories.map(cat =>
          databaseService.create('transaction_categories', {
            ...cat,
            school_id: schoolId,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-categories'] });
      toast.success('Default categories created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create default categories: ' + error.message);
    },
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      // Soft delete by updating is_active to false in Firebase
      await databaseService.update('transaction_categories', categoryId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete category: ' + error.message);
    },
  });

  const handleAddCategory = (parentCategory?: Category) => {
    setSelectedCategory(undefined);
    setSelectedParent(parentCategory);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedParent(undefined);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    if (confirm(`Are you sure you want to delete "${category.name}"? This will also delete all subcategories.`)) {
      deleteCategory.mutate(category.id);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Group categories by parent
  const rootCategories = categories.filter(cat => cat.level === 0);
  const categoryChildren = categories.reduce((acc, cat) => {
    if (cat.parent_id) {
      if (!acc[cat.parent_id]) acc[cat.parent_id] = [];
      acc[cat.parent_id].push(cat);
    }
    return acc;
  }, {} as Record<string, Category[]>);

  const renderCategory = (category: Category) => {
    const hasChildren = categoryChildren[category.id]?.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="border rounded-lg">
        <div className="p-4 flex items-center justify-between hover:bg-accent/50">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(category.id)}
                className="p-0 h-6 w-6"
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div className="flex items-center gap-2">
              {hasChildren ? (
                isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
              ) : (
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <span className="font-medium">{category.name}</span>
            </div>

            <Badge variant="outline" className={getTypeColor(category.type)}>
              {category.type}
            </Badge>

            {category.level > 0 && (
              <span className="text-sm text-muted-foreground">
                {category.full_path}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddCategory(category)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Add Sub</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditCategory(category)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteCategory(category)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="pl-8 pb-4 space-y-2">
            {categoryChildren[category.id].map(child => renderCategory(child))}
          </div>
        )}
      </div>
    );
  };

  if (!schoolId) {
    return (
      <Card className="glass glass-hover">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>No school ID found. Please log in again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="glass glass-hover">
        <CardContent className="p-6">
          <div className="text-center">Loading categories...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('Categories query error:', error);
  }

  return (
    <>
      <Card className="glass glass-hover">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction Categories</span>
            <div className="flex gap-2">
              {categories.length === 0 && (
                <Button
                  onClick={() => createDefaultCategories.mutate()}
                  disabled={createDefaultCategories.isPending}
                  variant="outline"
                >
                  Create Defaults
                </Button>
              )}
              <Button onClick={() => handleAddCategory()} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                Error loading categories: {error.message}
                <br />
                <span className="text-xs">Check the console for more details.</span>
              </p>
            </div>
          )}
          
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No categories found. Create some categories to organize your transactions.</p>
              {error && (
                <p className="text-xs mt-2 text-red-600">
                  There was an error loading categories. Please check your database connection.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {rootCategories.map(category => renderCategory(category))}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        parentCategory={selectedParent}
        mode={dialogMode}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['school-categories'] });
          setDialogOpen(false);
        }}
      />
    </>
  );
};

export default TransactionCategoriesManagement;
