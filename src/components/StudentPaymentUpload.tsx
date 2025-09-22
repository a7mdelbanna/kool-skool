import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, CreditCard, DollarSign, FileImage, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { databaseService } from '@/services/firebase/database.service';

interface PaymentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  studentId: string;
  amount: number;
  currency: string;
  onSuccess?: () => void;
}

export const StudentPaymentUpload: React.FC<PaymentUploadProps> = ({
  open,
  onOpenChange,
  subscriptionId,
  studentId,
  amount,
  currency,
  onSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'stripe'>('manual');
  const [paymentAmount, setPaymentAmount] = useState(amount.toString());
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [allPaymentMethods, setAllPaymentMethods] = useState<any[]>([]);
  const [manualPaymentAccounts, setManualPaymentAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

  // Fetch manual payment accounts when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchManualPaymentAccounts();
    }
  }, [open]);
  
  // Filter payment methods when currency changes
  React.useEffect(() => {
    if (allPaymentMethods.length > 0) {
      const filteredAccounts = allPaymentMethods.filter((pm: any) => pm.currency_code === selectedCurrency);
      setManualPaymentAccounts(filteredAccounts);
      
      // Select first account by default
      if (filteredAccounts.length > 0) {
        setSelectedAccount(filteredAccounts[0].id);
      } else {
        setSelectedAccount('');
      }
    }
  }, [selectedCurrency, allPaymentMethods]);

  const fetchManualPaymentAccounts = async () => {
    try {
      setLoadingAccounts(true);
      
      // Get school ID from localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const schoolId = user?.schoolId || user?.school_id;
      
      if (!schoolId) {
        console.error('School ID not found');
        return;
      }
      
      // Fetch payment methods for this school - try with query first
      console.log('Fetching payment methods for school:', schoolId);
      let paymentMethods = [];
      
      try {
        // Try fetching with camelCase fields first
        paymentMethods = await databaseService.query('paymentMethods', {
          where: [
            { field: 'schoolId', operator: '==', value: schoolId },
            { field: 'isActive', operator: '==', value: true }
          ]
        });
        console.log('Payment methods from paymentMethods collection:', paymentMethods);
      } catch (error) {
        console.log('paymentMethods collection not found, trying payment_methods');
      }
      
      // If no results, try underscore notation collection name
      if (!paymentMethods || paymentMethods.length === 0) {
        try {
          const allMethods = await databaseService.query('payment_methods', {});
          console.log('All methods from payment_methods collection:', allMethods);
          
          // Filter for this school's active payment methods
          paymentMethods = allMethods.filter((pm: any) => {
            const methodSchoolId = pm.schoolId || pm.school_id;
            const methodIsActive = pm.isActive !== undefined ? pm.isActive : (pm.is_active !== undefined ? pm.is_active : true);
            const matches = methodSchoolId === schoolId && methodIsActive;
            if (matches) {
              console.log('Matching payment method:', pm);
            }
            return matches;
          });
        } catch (error) {
          console.error('Error fetching payment methods:', error);
        }
      }
      
      console.log('Final payment methods count:', paymentMethods?.length || 0);
      
      // If still no payment methods found, try accounts collection as fallback
      if (!paymentMethods || paymentMethods.length === 0) {
        console.log('No payment methods found, trying accounts collection...');
        
        try {
          const allAccounts = await databaseService.query('accounts', {});
          console.log('All accounts from collection:', allAccounts);
          
          // Filter for this school's active accounts
          const accounts = allAccounts.filter((acc: any) => {
            const accountSchoolId = acc.school_id || acc.schoolId;
            const isActive = acc.status === 'active' || acc.status === undefined;
            const matches = accountSchoolId === schoolId && isActive;
            if (matches) {
              console.log('Matching account:', acc);
            }
            return matches;
          });
          
          // Convert accounts to payment method format
          paymentMethods = accounts.map((acc: any) => ({
            id: acc.id,
            account_name: acc.account_name || acc.name,
            bank_name: acc.bank_name || 'Bank Account',
            account_number: acc.account_number,
            currency_code: acc.currency_code || acc.currency || acc.currency_id,
            payment_instructions: acc.payment_instructions || acc.notes,
            routing_code: acc.routing_code || acc.swift_code,
            linked_account_id: acc.id
          }));
        } catch (error) {
          console.error('Error fetching accounts fallback:', error);
        }
      }
      
      if (paymentMethods && paymentMethods.length > 0) {
        // For each payment method, get the linked account's currency
        const paymentMethodsWithCurrency = await Promise.all(
          paymentMethods.map(async (pm: any) => {
            let accountCurrency = pm.currency; // Default to payment method's currency if set
            
            // Check for linkedAccountId with different field name variations
            const linkedAccountId = pm.linkedAccountId || pm.linked_bookkeeping_account_id || pm.linked_account_id;
            
            // If payment method has a linked bookkeeping account, get its currency
            if (linkedAccountId) {
              try {
                const account = await databaseService.getById('accounts', linkedAccountId);
                if (account) {
                  // Get the currency code from the account
                  if (account.currency_code) {
                    accountCurrency = account.currency_code;
                  } else if (account.currency_id) {
                    // If currency_id is stored, get the currency details
                    const currencyData = await databaseService.getById('currencies', account.currency_id);
                    if (currencyData) {
                      accountCurrency = currencyData.code || currencyData.currency_code;
                    }
                  }
                }
              } catch (error) {
                console.log('Could not fetch linked account, using default currency');
              }
            }
            
            // Resolve currency if it's an ID
            let resolvedCurrency = accountCurrency || pm.linked_bookkeeping_account_currency || pm.currency || 'USD';
            if (resolvedCurrency && resolvedCurrency.length > 10 && /^[a-zA-Z0-9]+$/.test(resolvedCurrency)) {
              try {
                const currencyData = await databaseService.getById('currencies', resolvedCurrency);
                resolvedCurrency = currencyData?.code || currencyData?.currency_code || resolvedCurrency;
              } catch (error) {
                console.log('Could not resolve currency ID:', resolvedCurrency);
              }
            }
            
            return {
              id: pm.id,
              account_name: pm.name || pm.method_name,
              bank_name: pm.bankName || pm.bank_name || pm.description || 'Payment Method',
              account_number: pm.accountNumber || pm.account_number,
              currency_code: resolvedCurrency,
              payment_instructions: pm.instructions || pm.payment_instructions,
              routing_code: pm.routingNumber || pm.routing_swift_code || pm.routing_code || pm.swiftCode,
              linked_account_id: linkedAccountId
            };
          })
        );
        
        paymentMethods = paymentMethodsWithCurrency;
      }
      
      console.log('Payment methods to process:', paymentMethods);
      
      // Store all payment methods globally for filtering
      setAllPaymentMethods(paymentMethods);
      
      // Get unique currencies from all payment methods and resolve currency names
      const currencyIds = [...new Set(paymentMethods.map((pm: any) => pm.currency_code).filter(Boolean))];
      console.log('Currency IDs found:', currencyIds);
      
      // If currency_code looks like an ID, fetch the actual currency details
      const resolvedCurrencies = await Promise.all(
        currencyIds.map(async (currencyId: string) => {
          // Check if it's a Firebase ID (long alphanumeric string)
          if (currencyId.length > 10 && /^[a-zA-Z0-9]+$/.test(currencyId)) {
            try {
              const currency = await databaseService.getById('currencies', currencyId);
              const resolved = currency?.code || currency?.currency_code || currencyId;
              console.log(`Resolved currency ${currencyId} to ${resolved}`);
              return resolved;
            } catch (error) {
              console.log('Could not fetch currency:', currencyId);
              return currencyId;
            }
          }
          return currencyId;
        })
      );
      
      console.log('Resolved currencies:', resolvedCurrencies);
      setAvailableCurrencies(resolvedCurrencies);
      
      // Initial filter for selected currency
      const filteredAccounts = paymentMethods.filter((pm: any) => pm.currency_code === selectedCurrency);
      console.log(`Filtered accounts for ${selectedCurrency}:`, filteredAccounts);
      setManualPaymentAccounts(filteredAccounts);
      
      // Select first account by default
      if (filteredAccounts.length > 0) {
        setSelectedAccount(filteredAccounts[0].id);
      } else {
        setSelectedAccount('');
      }
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmitManualPayment = async () => {
    if (!selectedAccount) {
      toast.error('Please select a payment method');
      return;
    }
    
    if (!selectedFile) {
      toast.error('Please upload a payment screenshot');
      return;
    }
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    try {
      setUploading(true);
      
      // Upload screenshot to Firebase Storage
      const timestamp = Date.now();
      const fileName = `payment-screenshots/${studentId}/${subscriptionId}/${timestamp}-${selectedFile.name}`;
      const storageRef = ref(storage, fileName);
      
      console.log('Uploading payment screenshot to:', fileName);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('Screenshot uploaded successfully:', downloadUrl);
      
      // Get selected account details
      const selectedAccountData = manualPaymentAccounts.find(acc => acc.id === selectedAccount);
      
      // Create payment record in Firebase
      const paymentData = {
        subscription_id: subscriptionId,
        student_id: studentId,
        amount: parseFloat(paymentAmount),
        currency: selectedCurrency,
        original_amount: amount,
        original_currency: currency,
        payment_method: 'manual',
        payment_account_id: selectedAccount,
        payment_account_name: selectedAccountData?.account_name || selectedAccountData?.name || 'Unknown',
        payment_status: 'pending_verification',
        screenshot_url: downloadUrl,
        notes: paymentNotes,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Creating payment record:', paymentData);
      const paymentId = await databaseService.create('student_payments', paymentData);
      console.log('Payment record created with ID:', paymentId);
      
      toast.success('Payment submitted successfully! Waiting for admin verification.');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setPaymentNotes('');
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      toast.error('Failed to submit payment: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleStripePayment = () => {
    toast.info('Stripe payment integration coming soon!');
    // TODO: Implement Stripe payment
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Submit Payment</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Choose your payment method and submit payment for your subscription
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Payment Method Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={paymentMethod === 'manual' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('manual')}
              className={paymentMethod === 'manual'
                ? "w-full bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                : "w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 border"}
            >
              <FileImage className="h-4 w-4 mr-2" />
              Manual Payment
            </Button>
            <Button
              variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('stripe')}
              className={paymentMethod === 'stripe'
                ? "w-full bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                : "w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 border"}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Card Payment
            </Button>
          </div>
          
          {/* Currency Selection */}
          {availableCurrencies.length > 1 && (
            <div className="space-y-2">
              <Label className="dark:text-gray-300">Select Currency</Label>
              <div className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {availableCurrencies.map((curr) => (
                  <Button
                    key={curr}
                    variant={selectedCurrency === curr ? 'default' : 'outline'}
                    onClick={() => setSelectedCurrency(curr)}
                    className={selectedCurrency === curr
                      ? "flex-1 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                      : "flex-1 bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500"}
                    size="sm"
                  >
                    {curr}
                  </Button>
                ))}
              </div>
              {selectedCurrency !== currency && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 p-2 rounded border border-amber-200 dark:border-amber-800">
                  <span className="font-medium">Note:</span> Original amount is <strong>{amount} {currency}</strong>. Please ensure correct amount in <strong>{selectedCurrency}</strong>.
                </p>
              )}
            </div>
          )}
          
          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="dark:text-gray-300">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-muted-foreground dark:text-gray-400">
                {selectedCurrency === 'USD' ? '$' : 
                 selectedCurrency === 'EUR' ? '€' : 
                 selectedCurrency === 'GBP' ? '£' : 
                 selectedCurrency === 'RUB' ? '₽' : 
                 selectedCurrency === 'JPY' ? '¥' : 
                 selectedCurrency === 'CNY' ? '¥' : 
                 selectedCurrency === 'INR' ? '₹' : 
                 selectedCurrency === 'KRW' ? '₩' : 
                 selectedCurrency === 'BRL' ? 'R$' : 
                 selectedCurrency === 'AUD' ? 'A$' : 
                 selectedCurrency === 'CAD' ? 'C$' : 
                 selectedCurrency === 'CHF' ? 'CHF' : 
                 selectedCurrency === 'SEK' ? 'kr' : 
                 selectedCurrency === 'NOK' ? 'kr' : 
                 selectedCurrency === 'DKK' ? 'kr' : 
                 selectedCurrency === 'PLN' ? 'zł' : 
                 selectedCurrency === 'TRY' ? '₺' : 
                 selectedCurrency === 'MXN' ? '$' : 
                 selectedCurrency === 'ARS' ? '$' : 
                 selectedCurrency === 'CLP' ? '$' : 
                 selectedCurrency === 'COP' ? '$' : 
                 selectedCurrency === 'PEN' ? 'S/' : 
                 selectedCurrency === 'UYU' ? '$U' : 
                 selectedCurrency === 'ZAR' ? 'R' : 
                 selectedCurrency === 'EGP' ? 'E£' : 
                 selectedCurrency === 'SAR' ? '﷼' : 
                 selectedCurrency === 'AED' ? 'د.إ' : 
                 selectedCurrency === 'ILS' ? '₪' : 
                 selectedCurrency === 'THB' ? '฿' : 
                 selectedCurrency === 'VND' ? '₫' : 
                 selectedCurrency === 'PHP' ? '₱' : 
                 selectedCurrency === 'IDR' ? 'Rp' : 
                 selectedCurrency === 'MYR' ? 'RM' : 
                 selectedCurrency === 'SGD' ? 'S$' : 
                 selectedCurrency === 'HKD' ? 'HK$' : 
                 selectedCurrency === 'TWD' ? 'NT$' : 
                 selectedCurrency === 'NZD' ? 'NZ$' : 
                 '$'}
              </span>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-gray-400">
                {selectedCurrency}
              </span>
            </div>
          </div>
          
          {paymentMethod === 'manual' ? (
            <>
              {/* Payment Account Selection */}
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm">Loading payment methods...</span>
                </div>
              ) : availableCurrencies.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  No payment methods configured in the school.
                  <br />
                  Please contact your administrator.
                </div>
              ) : manualPaymentAccounts.length > 0 ? (
                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Select Payment Method</Label>
                  <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {manualPaymentAccounts.map((account) => (
                      <div 
                        key={account.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedAccount === account.id
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 dark:border-primary'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedAccount(account.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={selectedAccount === account.id}
                            onChange={() => setSelectedAccount(account.id)}
                            className="mt-1 accent-blue-500 dark:accent-blue-400"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm dark:text-white">
                                  {account.account_name || account.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {account.bank_name || 'Bank Account'}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {account.currency_code || account.currency}
                              </span>
                            </div>
                            {account.payment_instructions && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                <p className="font-medium text-blue-900 dark:text-blue-400 mb-1">Payment Instructions:</p>
                                <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                                  {account.payment_instructions}
                                </p>
                              </div>
                            )}
                            <div className="mt-2 space-y-1">
                              {account.account_number && (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Account:</span> {account.account_number}
                                </p>
                              )}
                              {account.routing_code && (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Routing/SWIFT:</span> {account.routing_code}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  No payment methods available for {selectedCurrency}.
                  {availableCurrencies.length > 0 && (
                    <>
                      <br />
                      Try selecting a different currency above.
                    </>
                  )}
                </div>
              )}
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="screenshot" className="dark:text-gray-300">Payment Screenshot</Label>
                {!selectedFile ? (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-700/50">
                    <Upload className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Upload a screenshot of your payment
                    </p>
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Label
                      htmlFor="screenshot"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Choose File
                    </Label>
                  </div>
                ) : (
                  <div className="relative border dark:border-gray-600 rounded-lg p-2">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Payment screenshot"
                        className="w-full h-48 object-contain rounded"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-xs text-center mt-2 text-gray-600 dark:text-gray-400">
                      {selectedFile.name}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Payment Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="dark:text-gray-300">Payment Notes (Optional)</Label>
                <div className="p-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Textarea
                    id="notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add any additional information about this payment..."
                    rows={3}
                    className="w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secure card payment powered by Stripe
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Coming soon...
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </Button>
          {paymentMethod === 'manual' ? (
            <Button 
              onClick={handleSubmitManualPayment}
              disabled={!selectedFile || !selectedAccount || uploading || manualPaymentAccounts.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Payment
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleStripePayment}>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay with Card
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};