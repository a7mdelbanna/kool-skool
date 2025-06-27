
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
  contact_name: string;
  contact_type: string;
  status: string;
  created_at: string;
}

interface TransactionsByContactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  schoolId: string;
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'income':
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    case 'expense':
      return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    case 'transfer':
      return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
    default:
      return <ArrowRightLeft className="h-4 w-4 text-gray-600" />;
  }
};

const getTransactionColor = (type: string) => {
  switch (type) {
    case 'income':
      return 'text-green-600';
    case 'expense':
      return 'text-red-600';
    case 'transfer':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const TransactionsByContact: React.FC<TransactionsByContactProps> = ({
  open,
  onOpenChange,
  contactId,
  schoolId,
}) => {
  // Fetch contact info
  const { data: contact } = useQuery({
    queryKey: ['contact-with-tags', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase.rpc('get_contact_with_tags', {
        p_contact_id: contactId
      });

      if (error) {
        console.error('Error fetching contact:', error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!contactId && open,
  });

  // Fetch all transactions and filter by contact
  const { data: allTransactions, isLoading } = useQuery({
    queryKey: ['transactions-with-contacts', schoolId],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase.rpc('get_transactions_with_contacts', {
        p_school_id: schoolId
      });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      return (data as Transaction[]) || [];
    },
    enabled: !!schoolId && open,
  });

  // Filter transactions for the selected contact
  const contactTransactions = allTransactions?.filter(transaction => 
    contact && transaction.contact_name === contact.name
  ) || [];

  // Calculate totals
  const totals = contactTransactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      switch (transaction.type) {
        case 'income':
          acc.income += amount;
          break;
        case 'expense':
          acc.expenses += amount;
          break;
        case 'transfer':
          acc.transfers += amount;
          break;
      }
      return acc;
    },
    { income: 0, expenses: 0, transfers: 0 }
  );

  const netAmount = totals.income - totals.expenses;

  if (!contactId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>
                Transactions for {contact?.name || 'Loading...'}
              </DialogTitle>
              <DialogDescription>
                View all financial transactions related to this contact
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {contact && (
          <div className="space-y-6">
            {/* Contact Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {contact.name}
                  <Badge className="ml-2">
                    {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ${totals.income.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Total Income</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      ${totals.expenses.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Total Expenses</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${netAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Net Amount</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Transactions List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Transaction History ({contactTransactions.length})
              </h3>
              
              {isLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : contactTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions found for this contact
                </div>
              ) : (
                <div className="space-y-3">
                  {contactTransactions.map((transaction) => (
                    <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            {getTransactionIcon(transaction.type)}
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                              {transaction.type === 'expense' ? '-' : ''}
                              ${Number(transaction.amount).toFixed(2)} {transaction.currency}
                            </div>
                            <Badge className={`${getStatusColor(transaction.status)} text-xs`}>
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionsByContact;
