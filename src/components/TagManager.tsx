
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Tag, X, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserInfo } from '@/integrations/supabase/client';

interface TransactionTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  usage_count: number;
}

interface TagManagerProps {
  onTagSelect?: (tag: TransactionTag) => void;
  selectedTags?: TransactionTag[];
  showUsageCount?: boolean;
}

const TagManager: React.FC<TagManagerProps> = ({ 
  onTagSelect, 
  selectedTags = [], 
  showUsageCount = true 
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const queryClient = useQueryClient();

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch tags for the school
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['school-tags', userInfo?.[0]?.user_school_id],
    queryFn: async () => {
      if (!userInfo?.[0]?.user_school_id) return [];
      
      const { data, error } = await supabase.rpc('get_school_tags', {
        p_school_id: userInfo[0].user_school_id
      });
      
      if (error) throw error;
      return data as TransactionTag[];
    },
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tagData: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('transaction_tags')
        .insert({
          name: tagData.name,
          color: tagData.color,
          school_id: userInfo?.[0]?.user_school_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-tags'] });
      toast.success('Tag created successfully');
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to create tag: ' + error.message);
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('transaction_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-tags'] });
      toast.success('Tag deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete tag: ' + error.message);
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    createTagMutation.mutate({
      name: newTagName.trim(),
      color: newTagColor
    });
  };

  const handleDeleteTag = (tagId: string) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      deleteTagMutation.mutate(tagId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading tags...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Tags
        </CardTitle>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <Label htmlFor="tag-color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="tag-color"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-12 h-8 rounded border"
                  />
                  <Input
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTag}
                  disabled={createTagMutation.isPending}
                >
                  {createTagMutation.isPending ? 'Creating...' : 'Create Tag'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-1">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                style={{ borderColor: tag.color, color: tag.color }}
                onClick={() => onTagSelect?.(tag)}
              >
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tag.color }} />
                {tag.name}
                {showUsageCount && tag.usage_count > 0 && (
                  <span className="ml-1 text-xs opacity-70">({tag.usage_count})</span>
                )}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 hover:opacity-100"
                onClick={() => handleDeleteTag(tag.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-muted-foreground text-sm">No tags created yet. Create your first tag to get started.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TagManager;
