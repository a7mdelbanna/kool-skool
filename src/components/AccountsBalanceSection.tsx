import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AccountBalance {
  id: string;
  name: string;
  currency_symbol: string;
  currency_code: string;
  balance: number;
  color: string;
}

interface AccountsBalanceSectionProps {
  schoolId: string;
}

const AccountsBalanceSection: React.FC<AccountsBalanceSectionProps> = ({ schoolId }) => {
  // Get all school accounts with currency info
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['school-accounts', schoolId],
    queryFn: async (): Promise<AccountBalance[]> => {
      if (!schoolId) return [];
      
      const { data: accountsData, error: accountsError } = await supabase.rpc('get_school_accounts', {
        p_school_id: schoolId
      });

      if (accountsError) throw accountsError;

      console.log('📊 Raw accounts data:', accountsData);

      // Get all transactions to calculate balances
      const { data: transactionsData, error: transactionsError } = await supabase.rpc('get_school_transactions', {
        p_school_id: schoolId
      });

      if (transactionsError) throw transactionsError;

      console.log('💰 Raw transactions data:', transactionsData);

      // Calculate balance for each account in its native currency
      const accountBalances = (accountsData || []).map((account: any) => {
        let balance = 0;
        const accountCurrency = account.currency_code;

        console.log(`🏦 Calculating balance for account: ${account.name} (${accountCurrency})`);

        // Calculate balance from transactions that match this account's currency
        (transactionsData || []).forEach((transaction: any) => {
          // Enhanced debugging for transaction amount
          console.log(`🔍 Processing transaction:`, {
            id: transaction.id,
            amount: transaction.amount,
            type: typeof transaction.amount,
            currency: transaction.currency,
            transactionType: transaction.type,
            fromAccount: transaction.from_account_name,
            toAccount: transaction.to_account_name
          });

          // More robust amount validation
          let transactionAmount = 0;
          if (transaction.amount === null || transaction.amount === undefined) {
            console.warn('❌ Transaction amount is null/undefined:', transaction.id);
            return;
          }

          // Handle different data types
          if (typeof transaction.amount === 'string') {
            transactionAmount = parseFloat(transaction.amount);
          } else if (typeof transaction.amount === 'number') {
            transactionAmount = transaction.amount;
          } else {
            console.warn('❌ Invalid transaction amount type:', typeof transaction.amount, transaction.amount);
            return;
          }

          if (isNaN(transactionAmount) || !isFinite(transactionAmount)) {
            console.warn('❌ Invalid transaction amount after conversion:', transaction.amount, 'converted to:', transactionAmount);
            return;
          }

          // Only process transactions that match the account's currency
          if (transaction.currency !== accountCurrency) {
            console.log(`⚠️ Skipping transaction ${transaction.id}: currency mismatch (${transaction.currency} vs ${accountCurrency})`);
            return;
          }

          // For income transactions (money coming into an account)
          if (transaction.type === 'income' && transaction.to_account_name === account.name) {
            balance += transactionAmount;
            console.log(`➕ Income: +${transactionAmount} ${accountCurrency} to ${account.name} | New balance: ${balance}`);
          }
          
          // For expense transactions (money going out of an account)  
          if (transaction.type === 'expense' && transaction.from_account_name === account.name) {
            balance -= transactionAmount;
            console.log(`➖ Expense: -${transactionAmount} ${accountCurrency} from ${account.name} | New balance: ${balance}`);
          }
          
          // For transfer transactions
          if (transaction.type === 'transfer') {
            if (transaction.from_account_name === account.name) {
              balance -= transactionAmount;
              console.log(`🔄 Transfer out: -${transactionAmount} ${accountCurrency} from ${account.name} | New balance: ${balance}`);
            }
            if (transaction.to_account_name === account.name) {
              balance += transactionAmount;
              console.log(`🔄 Transfer in: +${transactionAmount} ${accountCurrency} to ${account.name} | New balance: ${balance}`);
            }
          }
        });

        // Final validation to ensure balance is a valid number
        if (isNaN(balance) || !isFinite(balance)) {
          console.error(`❌ Invalid balance calculated for ${account.name}: ${balance}`);
          balance = 0; // Fallback to 0 if calculation fails
        }

        console.log(`💼 Final balance for ${account.name}: ${balance} ${accountCurrency}`);

        return {
          id: account.id,
          name: account.name,
          currency_symbol: account.currency_symbol,
          currency_code: account.currency_code,
          balance: balance,
          color: account.color
        };
      });

      console.log('✅ All account balances calculated:', accountBalances);
      return accountBalances;
    },
    enabled: !!schoolId,
    staleTime: 5000, // Reduce stale time to 5 seconds for more frequent updates
    gcTime: 60000, // Reduce garbage collection time to 1 minute
  });

  if (accountsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No accounts found. Create accounts in the Settings page to track balances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Balances</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="font-medium">{account.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{account.currency_code}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-medium ${
                    account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {account.currency_symbol}{Math.abs(account.balance).toFixed(2)}
                    {account.balance < 0 && ' (deficit)'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AccountsBalanceSection;
