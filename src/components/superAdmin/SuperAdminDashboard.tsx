
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SuperAdminDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Super admin dashboard functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
