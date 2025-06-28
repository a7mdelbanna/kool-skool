
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentLevel {
  id: string;
  name: string;
  school_id: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StudentLevelFormData {
  name: string;
  color: string;
}

const StudentLevelsManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<StudentLevel | null>(null);
  const [formData, setFormData] = useState<StudentLevelFormData>({
    name: '',
    color: '#3B82F6'
  });

  const queryClient = useQueryClient();

  // Get current user's school ID
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const schoolId = user?.schoolId;

  // Fetch student levels
  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['student-levels', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('student_levels')
        .select('*')
        .eq('school_id', schoolId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching student levels:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Create level mutation
  const createLevelMutation = useMutation({
    mutationFn: async (levelData: StudentLevelFormData) => {
      if (!schoolId) throw new Error('School ID not found');

      const maxSortOrder = levels.length > 0 ? Math.max(...levels.map(l => l.sort_order)) : 0;
      
      const { data, error } = await supabase
        .from('student_levels')
        .insert([{
          ...levelData,
          school_id: schoolId,
          sort_order: maxSortOrder + 1
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating student level:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels', schoolId] });
      setIsDialogOpen(false);
      setFormData({ name: '', color: '#3B82F6' });
      toast.success('Student level created successfully');
    },
    onError: (error: any) => {
      console.error('Create level error:', error);
      toast.error('Failed to create student level: ' + error.message);
    },
  });

  // Update level mutation
  const updateLevelMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudentLevel> & { id: string }) => {
      const { data, error } = await supabase
        .from('student_levels')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating student level:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels', schoolId] });
      setIsDialogOpen(false);
      setEditingLevel(null);
      setFormData({ name: '', color: '#3B82F6' });
      toast.success('Student level updated successfully');
    },
    onError: (error: any) => {
      console.error('Update level error:', error);
      toast.error('Failed to update student level: ' + error.message);
    },
  });

  // Delete level mutation
  const deleteLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_levels')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting student level:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels', schoolId] });
      toast.success('Student level deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete level error:', error);
      toast.error('Failed to delete student level: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Level name is required');
      return;
    }

    if (editingLevel) {
      updateLevelMutation.mutate({
        id: editingLevel.id,
        name: formData.name.trim(),
        color: formData.color
      });
    } else {
      createLevelMutation.mutate({
        name: formData.name.trim(),
        color: formData.color
      });
    }
  };

  const handleEdit = (level: StudentLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      color: level.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (level: StudentLevel) => {
    if (window.confirm(`Are you sure you want to delete the "${level.name}" level?`)) {
      deleteLevelMutation.mutate(level.id);
    }
  };

  const handleToggleActive = (level: StudentLevel) => {
    updateLevelMutation.mutate({
      id: level.id,
      is_active: !level.is_active
    });
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setEditingLevel(null);
    setFormData({ name: '', color: '#3B82F6' });
  };

  return (
    <Card className="glass glass-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Student Levels</CardTitle>
            <CardDescription>
              Manage the proficiency levels available for your students
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Level
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? 'Edit Student Level' : 'Add New Student Level'}
                </DialogTitle>
                <DialogDescription>
                  {editingLevel 
                    ? 'Update the student level details below.'
                    : 'Create a new proficiency level for your students.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Level Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Beginner, Intermediate, Advanced"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded border border-input cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetDialog}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createLevelMutation.isPending || updateLevelMutation.isPending}
                  >
                    {editingLevel ? 'Update Level' : 'Create Level'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading levels...</div>
          </div>
        ) : levels.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <div className="mb-2">No student levels found</div>
            <div className="text-sm">Create your first level to get started</div>
          </div>
        ) : (
          <div className="space-y-2">
            {levels.map((level) => (
              <div
                key={level.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: level.color }}
                  />
                  <div>
                    <div className="font-medium">{level.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Order: {level.sort_order}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${level.id}`} className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id={`active-${level.id}`}
                      checked={level.is_active}
                      onCheckedChange={() => handleToggleActive(level)}
                      disabled={updateLevelMutation.isPending}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(level)}
                    disabled={updateLevelMutation.isPending}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(level)}
                    disabled={deleteLevelMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentLevelsManagement;
