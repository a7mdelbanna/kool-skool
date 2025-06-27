
import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import CurrencyDialog from './CurrencyDialog';

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
  exchange_rate: number;
  is_default: boolean;
  created_at: string;
}

const CurrencyManagement = () => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | undefined>();
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  const fetchCurrencies = async () => {
    if (!user?.schoolId) return;

    try {
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: user.schoolId
      });

      if (error) throw error;
      setCurrencies(data || []);
    } catch (error: any) {
      console.error('Error fetching currencies:', error);
      toast({
        title: "Error",
        description: "Failed to load currencies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, [user?.schoolId]);

  const handleAddCurrency = () => {
    setSelectedCurrency(undefined);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditCurrency = (currency: Currency) => {
    setSelectedCurrency(currency);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleSetDefault = async (currencyId: string) => {
    if (!user?.schoolId) return;

    try {
      const { data, error } = await supabase.rpc('set_default_currency', {
        p_currency_id: currencyId,
        p_school_id: user.schoolId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default currency updated successfully",
      });

      fetchCurrencies();
    } catch (error: any) {
      console.error('Error setting default currency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set default currency",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCurrency = async (currencyId: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Error",
        description: "Cannot delete the default currency",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this currency?')) return;

    try {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', currencyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Currency deleted successfully",
      });

      fetchCurrencies();
    } catch (error: any) {
      console.error('Error deleting currency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete currency",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currencies
          </CardTitle>
          <CardDescription>Loading currencies...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Currencies
              </CardTitle>
              <CardDescription>
                Manage currencies for your school. Set exchange rates relative to your default currency.
              </CardDescription>
            </div>
            <Button onClick={handleAddCurrency} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Currency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currencies.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No currencies found</h3>
              <p className="text-muted-foreground mb-4">
                Add your first currency to get started with multi-currency support.
              </p>
              <Button onClick={handleAddCurrency} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Currency
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Exchange Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell className="font-medium">{currency.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{currency.code}</Badge>
                    </TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell>
                      {currency.is_default ? '1.00' : currency.exchange_rate.toFixed(6)}
                    </TableCell>
                    <TableCell>
                      {currency.is_default ? (
                        <Badge className="bg-green-100 text-green-800">Default</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(currency.id)}
                          className="h-6 px-2 text-xs"
                        >
                          Set as Default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCurrency(currency)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCurrency(currency.id, currency.is_default)}
                          disabled={currency.is_default}
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
      </Card>

      <CurrencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currency={selectedCurrency}
        mode={dialogMode}
        schoolId={user?.schoolId || ''}
        onSuccess={fetchCurrencies}
      />
    </>
  );
};

export default CurrencyManagement;
