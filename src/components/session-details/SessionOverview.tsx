import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SessionDetails } from '@/services/firebase/sessionDetails.service';

interface SessionOverviewProps {
  details: SessionDetails | null;
  onUpdate: (updates: Partial<SessionDetails>) => void;
}

const SessionOverview: React.FC<SessionOverviewProps> = ({ details, onUpdate }) => {
  if (!details) return null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Session Information</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={details.topic || ''}
              onChange={(e) => onUpdate({ topic: e.target.value })}
              placeholder="Enter session topic..."
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Session Notes</Label>
            <Textarea
              id="notes"
              value={details.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Add detailed notes about the session..."
              className="mt-1 min-h-[200px]"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SessionOverview;