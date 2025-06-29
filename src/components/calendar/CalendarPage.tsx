
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CalendarPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Calendar</h1>
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Calendar functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
