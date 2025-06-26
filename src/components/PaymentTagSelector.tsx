
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, Plus, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserInfo } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TransactionTag {
  id: string;
  name: string;
  color: string;
}

interface PaymentTagSelectorProps {
  paymentId: string;
  currentTags: TransactionTag[];
  onTagsChange: (tags: TransactionTag[]) => void;
}

const PaymentTagSelector: React.FC<PaymentTagSelectorProps> = ({
  paymentId,
  currentTags,
  onTagsChange
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch available tags
  const { data: availableTags = [] } = useQuery({
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

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { data, error } = await supabase.rpc('add_payment_tag', {
        p_payment_id: paymentId,
        p_tag_id: tagId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, tagId) => {
      const addedTag = availableTags.find(tag => tag.id === tagId);
      if (addedTag) {
        onTagsChange([...currentTags, addedTag]);
        toast.success('Tag added to payment');
      }
    },
    onError: (error: any) => {
      toast.error('Failed to add tag: ' + error.message);
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { data, error } = await supabase.rpc('remove_payment_tag', {
        p_payment_id: paymentId,
        p_tag_id: tagId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, tagId) => {
      const updatedTags = currentTags.filter(tag => tag.id !== tagId);
      onTagsChange(updatedTags);
      toast.success('Tag removed from payment');
    },
    onError: (error: any) => {
      toast.error('Failed to remove tag: ' + error.message);
    },
  });

  const handleAddTag = (tagId: string) => {
    if (currentTags.some(tag => tag.id === tagId)) {
      toast.error('Tag already added to this payment');
      return;
    }
    addTagMutation.mutate(tagId);
    setIsPopoverOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    removeTagMutation.mutate(tagId);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Current tags */}
      {currentTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="flex items-center gap-1 pr-1"
          style={{ borderColor: tag.color, color: tag.color }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
          {tag.name}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleRemoveTag(tag.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Add tag button */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-3 w-3" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {availableTags
                .filter(tag => !currentTags.some(currentTag => currentTag.id === tag.id))
                .map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleAddTag(tag.id)}
                    className="flex items-center gap-2"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </CommandItem>
                ))
              }
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PaymentTagSelector;
