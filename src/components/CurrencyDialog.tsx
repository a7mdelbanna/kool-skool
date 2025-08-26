
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currencyApiService } from '@/services/currencyApi.service';
import { databaseService } from '@/services/firebase/database.service';

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
  exchange_rate: number;
  is_default: boolean;
}

interface CurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: Currency;
  mode: 'add' | 'edit';
  schoolId: string;
  onSuccess: () => void;
}

const CurrencyDialog = ({ open, onOpenChange, currency, mode, schoolId, onSuccess }: CurrencyDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [supportedCurrencies] = useState(currencyApiService.getSupportedCurrencies());
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    code: '',
    exchange_rate: 1.0,
    is_default: false
  });

  useEffect(() => {
    if (currency && mode === 'edit') {
      setFormData({
        name: currency.name,
        symbol: currency.symbol,
        code: currency.code,
        exchange_rate: currency.exchange_rate,
        is_default: currency.is_default
      });
    } else {
      setFormData({
        name: '',
        symbol: '',
        code: '',
        exchange_rate: 1.0,
        is_default: false
      });
    }
  }, [currency, mode, open]);

  // Fetch default currency when dialog opens
  useEffect(() => {
    if (open && schoolId) {
      fetchDefaultCurrency();
    }
  }, [open, schoolId]);

  const fetchDefaultCurrency = async () => {
    try {
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: schoolId
      });
      
      if (data && !error) {
        const defaultCurr = data.find((c: Currency) => c.is_default);
        setDefaultCurrency(defaultCurr || null);
      }
    } catch (error) {
      console.error('Error fetching default currency:', error);
    }
  };

  // Handle currency code selection
  const handleCurrencyCodeChange = async (code: string) => {
    const selectedCurrency = supportedCurrencies.find(c => c.code === code);
    if (!selectedCurrency) return;

    setFormData(prev => ({
      ...prev,
      code: selectedCurrency.code,
      name: selectedCurrency.name,
      symbol: selectedCurrency.symbol
    }));

    // Fetch exchange rate if not setting as default and have a default currency
    if (!formData.is_default && defaultCurrency && mode === 'add') {
      setFetchingRate(true);
      try {
        const rate = await currencyApiService.getExchangeRate(defaultCurrency.code, code);
        setFormData(prev => ({
          ...prev,
          exchange_rate: rate
        }));
        toast({
          title: "Exchange rate fetched",
          description: `Current rate: 1 ${defaultCurrency.code} = ${rate.toFixed(6)} ${code}`,
        });
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        toast({
          title: "Warning",
          description: "Could not fetch exchange rate. Using default rate of 1.0",
          variant: "destructive",
        });
      } finally {
        setFetchingRate(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.symbol || !formData.code) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      if (mode === 'add') {
        // Save to Firebase instead of Supabase
        await databaseService.create('currencies', {
          school_id: schoolId,
          name: formData.name,
          symbol: formData.symbol,
          code: formData.code.toUpperCase(),
          exchange_rate: formData.exchange_rate,
          is_default: formData.is_default,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "Currency added successfully",
        });
      } else if (currency) {
        // Update in Firebase instead of Supabase
        await databaseService.update('currencies', currency.id, {
          name: formData.name,
          symbol: formData.symbol,
          code: formData.code.toUpperCase(),
          exchange_rate: formData.exchange_rate,
          updated_at: new Date().toISOString()
        });

        // Handle default currency setting separately
        if (formData.is_default && !currency.is_default) {
          // Update all currencies to set is_default to false
          const allCurrencies = await databaseService.query('currencies', {
            where: [{ field: 'school_id', operator: '==', value: schoolId }]
          });
          
          // Update all to not default
          await Promise.all(
            allCurrencies.map(curr => 
              databaseService.update('currencies', curr.id, { is_default: false })
            )
          );
          
          // Set this one as default
          await databaseService.update('currencies', currency.id, { is_default: true });
        }

        toast({
          title: "Success",
          description: "Currency updated successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving currency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save currency",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Currency' : 'Edit Currency'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Add a new currency to your school.' 
              : 'Update the currency details.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Currency *
              </Label>
              <Select 
                value={formData.code} 
                onValueChange={handleCurrencyCodeChange}
                disabled={mode === 'edit'}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {supportedCurrencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{curr.code} - {curr.name}</span>
                        <span className="ml-2 text-muted-foreground">{curr.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {formData.code && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name</Label>
                  <div className="col-span-3 p-2 bg-muted rounded">
                    {formData.name}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Symbol</Label>
                  <div className="col-span-3 p-2 bg-muted rounded">
                    {formData.symbol}
                  </div>
                </div>
              </>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="exchange_rate" className="text-right">
                Exchange Rate
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) || 1.0 }))}
                  placeholder="1.0"
                  disabled={formData.is_default || fetchingRate}
                  className="flex-1"
                />
                {fetchingRate && <span className="text-sm text-muted-foreground">Fetching...</span>}
                {!formData.is_default && defaultCurrency && (
                  <span className="text-sm text-muted-foreground">
                    1 {defaultCurrency.code} = {formData.exchange_rate.toFixed(6)} {formData.code}
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_default" className="text-right">
                Default Currency
              </Label>
              <div className="flex items-center gap-2 col-span-3">
                <Switch 
                  id="is_default" 
                  checked={formData.is_default} 
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.is_default ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (mode === 'add' ? 'Add Currency' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencyDialog;
