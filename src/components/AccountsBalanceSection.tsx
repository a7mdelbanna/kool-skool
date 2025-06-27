
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

      // Helper function to safely convert transaction amount to number
      const safeParseAmount = (amount: any): number => {
        if (amount === null || amount === undefined || amount === '') {
          console.warn('⚠️ Empty or null amount detected:', amount);
          return 0;
        }

        let numericAmount: number;
        
        if (typeof amount === 'string') {
          // Remove any non-numeric characters except decimal point and minus sign
          const cleanAmount = amount.replace(/[^\d.-]/g, '');
          numericAmount = parseFloat(cleanAmount);
        } else if (typeof amount === 'number') {
          numericAmount = amount;
        } else {
          console.warn('⚠️ Invalid amount type:', typeof amount, amount);
          return 0;
        }

        // Final validation
        if (isNaN(numericAmount) || !isFinite(numericAmount)) {
          console.warn('⚠️ Invalid amount after parsing:', amount, 'resulted in:', numericAmount);
          return 0;
        }

        return numericAmount;
      };

      // Calculate balance for each account in its native currency
      const accountBalances = (accountsData || []).map((account: any) => {
        let balance = 0;
        const accountCurrency = account.currency_code;

        console.log(`🏦 Calculating balance for account: ${account.name} (${accountCurrency})`);

        // Filter and process transactions that match this account's currency
        const relevantTransactions = (transactionsData || []).filter((transaction: any) => {
          // Only process transactions that match the account's currency
          return transaction.currency === accountCurrency;
        });

        console.log(`📋 Found ${relevantTransactions.length} transactions for ${account.name} in ${accountCurrency}`);

        relevantTransactions.forEach((transaction: any) => {
          const transactionAmount = safeParseAmount(transaction.amount);
          
          if (transactionAmount === 0) {
            console.log(`⚠️ Skipping transaction ${transaction.id} due to invalid amount`);
            return;
          }

          console.log(`🔍 Processing transaction:`, {
            id: transaction.id,
            amount: transaction.amount,
            parsedAmount: transactionAmount,
            currency: transaction.currency,
            type: transaction.type,
            fromAccount: transaction.from_account_name,
            toAccount: transaction.to_account_name
          });

          // For income transactions (money coming into an account)
          if (transaction.type === 'income' && transaction.to_account_name === account.name) {
            balance += transactionAmount;
            console.log(`➕ Income: +${transactionAmount} ${accountCurrency} to ${account.name} | New balance: ${balance}`);
          }
          
          // For expense transactions (money going out of an account)  
          else if (transaction.type === 'expense' && transaction.from_account_name === account.name) {
            balance -= transactionAmount;
            console.log(`➖ Expense: -${transactionAmount} ${accountCurrency} from ${account.name} | New balance: ${balance}`);
          }
          
          // For transfer transactions
          else if (transaction.type === 'transfer') {
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
          console.error(`❌ Invalid balance calculated for ${account.name}: ${balance}. Resetting to 0.`);
          balance = 0;
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
    staleTime: 1000, // Very short stale time to ensure fresh data
    gcTime: 10000, // Short garbage collection time
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: true, // Always refetch on mount
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
