
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CoursesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Courses</h1>
      <Card>
        <CardHeader>
          <CardTitle>Course Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Course management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
