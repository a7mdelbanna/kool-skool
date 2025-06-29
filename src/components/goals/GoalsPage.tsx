
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const GoalsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Goals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Goal Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Goal tracking functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
