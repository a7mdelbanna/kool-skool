
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const StudentLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Student Login</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Student login functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
