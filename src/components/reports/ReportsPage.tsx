
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Reporting functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
