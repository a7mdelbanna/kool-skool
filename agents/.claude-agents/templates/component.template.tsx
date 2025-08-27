import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserContext } from '@/App';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  className?: string;
  // Add your props here
}

const ComponentName: React.FC<ComponentNameProps> = ({ 
  className 
}) => {
  // Context
  const { user } = useContext(UserContext);
  const queryClient = useQueryClient();
  
  // State
  const [localState, setLocalState] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-key', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return null;
      // Replace with actual service call
      // return await service.getData(user.schoolId);
      return null;
    },
    enabled: !!user?.schoolId
  });
  
  // Mutations
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Replace with actual service call
      // return await service.updateData(data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-key'] });
      toast.success('Action completed successfully');
    },
    onError: (error: any) => {
      console.error('Action failed:', error);
      toast.error(error.message || 'An error occurred');
    }
  });
  
  // Effects
  useEffect(() => {
    // Add side effects here
  }, []);
  
  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await mutation.mutateAsync({ value: localState });
      setLocalState('');
    } catch (error) {
      // Error handled by mutation
    } finally {
      setLoading(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Main render
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Component Title</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input">Label</Label>
            <Input
              id="input"
              value={localState}
              onChange={(e) => setLocalState(e.target.value)}
              placeholder="Enter value"
              disabled={loading || mutation.isPending}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading || mutation.isPending || !localState}
            className="w-full"
          >
            {loading || mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
        
        {data && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComponentName;