
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const StudentDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>My Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Student dashboard functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
