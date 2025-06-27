
import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit2, Trash2, Archive, ArchiveX, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import AccountDialog from './AccountDialog';

interface Account {
  id: string;
  name: string;
  type: string;
  account_number: string;
  color: string;
  exclude_from_stats: boolean;
  is_archived: boolean;
  created_at: string;
  currency_id: string;
  currency_name: string;
  currency_symbol: string;
  currency_code: string;
}

const AccountsManagement = () => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [showArchived, setShowArchived] = useState(false);

  const fetchAccounts = async () => {
    if (!user?.schoolId) return;

    try {
      const { data, error } = await supabase.rpc('get_school_accounts', {
        p_school_id: user.schoolId
      });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user?.schoolId]);

  const handleAddAccount = () => {
    setSelectedAccount(undefined);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleToggleArchive = async (accountId: string, isArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ 
          is_archived: !isArchived,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Account ${!isArchived ? 'archived' : 'restored'} successfully`,
      });

      fetchAccounts();
    } catch (error: any) {
      console.error('Error toggling archive status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to permanently delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account deleted successfully",
      });

      fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  const filteredAccounts = accounts.filter(account => 
    showArchived ? account.is_archived : !account.is_archived
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Accounts
          </CardTitle>
          <CardDescription>Loading accounts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Accounts
            </CardTitle>
            <CardDescription>
              Manage your financial accounts for tracking transactions and reporting.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <label htmlFor="show-archived" className="text-sm">
                Show archived
              </label>
            </div>
            <Button onClick={handleAddAccount} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {showArchived ? 'No archived accounts' : 'No accounts found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {showArchived 
                ? 'You don\'t have any archived accounts.' 
                : 'Create your first account to start tracking financial transactions.'
              }
            </p>
            {!showArchived && (
              <Button onClick={handleAddAccount} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id} className={account.is_archived ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <span>{account.name}</span>
                      {account.is_archived && (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{account.currency_symbol}</span>
                      <span className="text-muted-foreground">{account.currency_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.account_number || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {account.exclude_from_stats && (
                        <Badge variant="secondary" className="text-xs">
                          Excluded from stats
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                        disabled={account.is_archived}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleArchive(account.id, account.is_archived)}
                      >
                        {account.is_archived ? (
                          <ArchiveX className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        mode={dialogMode}
        schoolId={user?.schoolId || ''}
        onSuccess={fetchAccounts}
      />
    </Card>
  );
};

export default AccountsManagement;
