
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TransactionsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Financial Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Transaction management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
