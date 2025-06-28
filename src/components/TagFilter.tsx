
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserInfo } from '@/integrations/supabase/client';

interface TransactionTag {
  id: string;
  name: string;
  color: string;
  usage_count: number;
}

interface TagFilterProps {
  selectedTagFilter: string | null;
  onTagFilterChange: (tagId: string | null) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ 
  selectedTagFilter, 
  onTagFilterChange 
}) => {
  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch available tags for filtering
  const { data: availableTags = [], isLoading } = useQuery({
    queryKey: ['school-tags', userInfo?.[0]?.user_school_id],
    queryFn: async () => {
      if (!userInfo?.[0]?.user_school_id) return [];
      
      const { data, error } = await supabase.rpc('get_school_tags', {
        p_school_id: userInfo[0].user_school_id
      });
      
      if (error) throw error;
      return data as TransactionTag[] || [];
    },
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  if (isLoading || availableTags.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Filter by Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedTagFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => onTagFilterChange(null)}
          >
            All Transactions
          </Button>
          {availableTags.map((tag) => (
            <Button
              key={tag.id}
              variant={selectedTagFilter === tag.id ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => onTagFilterChange(selectedTagFilter === tag.id ? null : tag.id)}
              style={selectedTagFilter === tag.id ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
              {tag.usage_count > 0 && (
                <span className="text-xs opacity-70">({tag.usage_count})</span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TagFilter;
