
import React, { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currency_id: string;
  account_number?: string;
  color: string;
  exclude_from_stats: boolean;
  is_archived: boolean;
}

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  mode: 'add' | 'edit';
  schoolId: string;
  onSuccess: () => void;
}

const ACCOUNT_TYPES = [
  'General',
  'Cash',
  'Current Account',
  'Savings',
  'Bonus',
  'Insurance',
  'Investment',
  'Loan',
  'Mortgage'
];

const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
  '#EC4899', '#6B7280', '#DC2626', '#059669'
];

const AccountDialog = ({ open, onOpenChange, account, mode, schoolId, onSuccess }: AccountDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'General',
    currency_id: '',
    account_number: '',
    color: '#3B82F6',
    exclude_from_stats: false
  });

  const fetchCurrencies = async () => {
    if (!schoolId) return;

    try {
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: schoolId
      });

      if (error) throw error;
      setCurrencies(data || []);

      // Set default currency if available and no account is being edited
      if (!account && data?.length > 0) {
        const defaultCurrency = data.find((c: Currency) => c.is_default);
        if (defaultCurrency) {
          setFormData(prev => ({ ...prev, currency_id: defaultCurrency.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, [schoolId]);

  useEffect(() => {
    if (account && mode === 'edit') {
      setFormData({
        name: account.name,
        type: account.type,
        currency_id: account.currency_id,
        account_number: account.account_number || '',
        color: account.color,
        exclude_from_stats: account.exclude_from_stats
      });
    } else if (mode === 'add') {
      setFormData({
        name: '',
        type: 'General',
        currency_id: '',
        account_number: '',
        color: '#3B82F6',
        exclude_from_stats: false
      });
    }
  }, [account, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      if (mode === 'add') {
        const { error } = await supabase
          .from('accounts')
          .insert({
            school_id: user.schoolId,
            name: formData.name,
            type: formData.type,
            currency_id: formData.currency_id,
            account_number: formData.account_number || null,
            color: formData.color,
            exclude_from_stats: formData.exclude_from_stats
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Account created successfully",
        });
      } else {
        const { error } = await supabase
          .from('accounts')
          .update({
            name: formData.name,
            type: formData.type,
            currency_id: formData.currency_id,
            account_number: formData.account_number || null,
            color: formData.color,
            exclude_from_stats: formData.exclude_from_stats,
            updated_at: new Date().toISOString()
          })
          .eq('id', account?.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Account updated successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Account' : 'Edit Account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Create a new financial account to track transactions'
              : 'Update account information'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Main Business Account"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={formData.currency_id} onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{currency.symbol}</span>
                      <span>{currency.name} ({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Account Number (Optional)</Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
              placeholder="e.g., 1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="exclude_stats"
              checked={formData.exclude_from_stats}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, exclude_from_stats: checked }))}
            />
            <Label htmlFor="exclude_stats">Exclude from statistics</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (mode === 'add' ? 'Create Account' : 'Update Account')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
