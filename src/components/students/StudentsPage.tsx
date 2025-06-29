
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const StudentsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Students</h1>
      <Card>
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Student management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
