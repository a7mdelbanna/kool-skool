
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
        const { error } = await supabase
          .from('currencies')
          .insert([{
            school_id: schoolId,
            name: formData.name,
            symbol: formData.symbol,
            code: formData.code.toUpperCase(),
            exchange_rate: formData.exchange_rate,
            is_default: formData.is_default
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Currency added successfully",
        });
      } else if (currency) {
        const { error } = await supabase
          .from('currencies')
          .update({
            name: formData.name,
            symbol: formData.symbol,
            code: formData.code.toUpperCase(),
            exchange_rate: formData.exchange_rate,
            updated_at: new Date().toISOString()
          })
          .eq('id', currency.id);

        if (error) throw error;

        // Handle default currency setting separately
        if (formData.is_default && !currency.is_default) {
          const { error: defaultError } = await supabase.rpc('set_default_currency', {
            p_currency_id: currency.id,
            p_school_id: schoolId
          });

          if (defaultError) throw defaultError;
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
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="US Dollar"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                Symbol *
              </Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                className="col-span-3"
                placeholder="$"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Code *
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="col-span-3"
                placeholder="USD"
                maxLength={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="exchange_rate" className="text-right">
                Exchange Rate
              </Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.000001"
                min="0.000001"
                value={formData.exchange_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) || 1.0 }))}
                className="col-span-3"
                placeholder="1.0"
              />
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
