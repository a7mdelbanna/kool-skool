import React from 'react';
import { 
  Wallet, 
  DollarSign
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CurrencyManagement from '@/components/CurrencyManagement';
import AccountsManagement from '@/components/AccountsManagement';

const FinancialSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your financial accounts and currency settings</p>
      </div>
      
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="accounts" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span>Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="currencies" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Currencies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-0 space-y-6">
          <AccountsManagement />
        </TabsContent>

        <TabsContent value="currencies" className="mt-0 space-y-6">
          <CurrencyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialSettings;