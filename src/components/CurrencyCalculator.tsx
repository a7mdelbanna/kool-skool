
import React, { useState, useEffect, useContext } from 'react';
import { Calculator, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { currencyApiService } from '@/services/currencyApi.service';
import { useToast } from '@/hooks/use-toast';

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
  exchange_rate: number;
  is_default: boolean;
}

const CurrencyCalculator = () => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [fromCurrency, setFromCurrency] = useState<string>('');
  const [toCurrency, setToCurrency] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [useApiRates, setUseApiRates] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [liveRate, setLiveRate] = useState<number | null>(null);

  const fetchCurrencies = async () => {
    if (!user?.schoolId) return;

    try {
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: user.schoolId
      });

      if (error) throw error;
      setCurrencies(data || []);
      
      // Set default currency as from currency if available
      const defaultCurrency = data?.find((c: Currency) => c.is_default);
      if (defaultCurrency) {
        setFromCurrency(defaultCurrency.id);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, [user?.schoolId]);

  const calculateConversion = async () => {
    if (!amount || !fromCurrency || !toCurrency || currencies.length === 0) {
      setResult('');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      setResult('Invalid amount');
      return;
    }

    const fromCurrencyData = currencies.find(c => c.id === fromCurrency);
    const toCurrencyData = currencies.find(c => c.id === toCurrency);

    if (!fromCurrencyData || !toCurrencyData) {
      setResult('Currency not found');
      return;
    }

    let convertedAmount: number;
    
    // Use live API rate if enabled and available
    if (useApiRates && liveRate !== null) {
      convertedAmount = numAmount * liveRate;
    } else {
      // Use stored rates
      if (fromCurrencyData.is_default) {
        // From default currency to another
        convertedAmount = numAmount * toCurrencyData.exchange_rate;
      } else if (toCurrencyData.is_default) {
        // From another currency to default
        convertedAmount = numAmount / fromCurrencyData.exchange_rate;
      } else {
        // Between two non-default currencies
        // First convert to default currency, then to target currency
        const inDefaultCurrency = numAmount / fromCurrencyData.exchange_rate;
        convertedAmount = inDefaultCurrency * toCurrencyData.exchange_rate;
      }
    }

    setResult(`${toCurrencyData.symbol}${convertedAmount.toFixed(2)}`);
  };

  // Fetch live exchange rate from API
  const fetchLiveRate = async () => {
    if (!fromCurrency || !toCurrency) return;

    const fromCurrencyData = currencies.find(c => c.id === fromCurrency);
    const toCurrencyData = currencies.find(c => c.id === toCurrency);

    if (!fromCurrencyData || !toCurrencyData) return;

    setFetchingRate(true);
    try {
      const rate = await currencyApiService.getExchangeRate(
        fromCurrencyData.code,
        toCurrencyData.code
      );
      setLiveRate(rate);
      setUseApiRates(true);
      toast({
        title: "Live rate fetched",
        description: `Using real-time exchange rate: 1 ${fromCurrencyData.code} = ${rate.toFixed(6)} ${toCurrencyData.code}`,
      });
    } catch (error) {
      console.error('Error fetching live rate:', error);
      toast({
        title: "Warning",
        description: "Could not fetch live rate. Using stored rates.",
        variant: "destructive",
      });
      setUseApiRates(false);
      setLiveRate(null);
    } finally {
      setFetchingRate(false);
    }
  };

  useEffect(() => {
    calculateConversion();
  }, [amount, fromCurrency, toCurrency, currencies, useApiRates, liveRate]);

  // Reset live rate when currencies change
  useEffect(() => {
    setUseApiRates(false);
    setLiveRate(null);
  }, [fromCurrency, toCurrency]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Currency Calculator
          </CardTitle>
          <CardDescription>Loading calculator...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (currencies.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Currency Calculator
          </CardTitle>
          <CardDescription>
            Add at least 2 currencies to use the calculator
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Currency Calculator
        </CardTitle>
        <CardDescription>
          Test your currency exchange rates by converting between currencies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* From Currency */}
          <div className="space-y-2">
            <Label htmlFor="from-currency">From Currency</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{currency.symbol}</span>
                      <span>{currency.name} ({currency.code})</span>
                      {currency.is_default && (
                        <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <Label htmlFor="to-currency">To Currency</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{currency.symbol}</span>
                      <span>{currency.name} ({currency.code})</span>
                      {currency.is_default && (
                        <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount to convert"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>

        {/* Conversion Result */}
        {fromCurrency && toCurrency && amount && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-4 text-lg">
              <div className="text-center">
                <div className="font-medium">
                  {currencies.find(c => c.id === fromCurrency)?.symbol}{amount}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencies.find(c => c.id === fromCurrency)?.code}
                </div>
              </div>
              
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              
              <div className="text-center">
                <div className="font-medium text-primary">
                  {result || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencies.find(c => c.id === toCurrency)?.code}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exchange Rate Info */}
        {fromCurrency && toCurrency && fromCurrency !== toCurrency && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              {useApiRates && liveRate !== null ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Live Rate
                  </span>
                  1 {currencies.find(c => c.id === fromCurrency)?.code} = {liveRate.toFixed(6)} {currencies.find(c => c.id === toCurrency)?.code}
                </span>
              ) : (
                <span>Stored rate: 1 {currencies.find(c => c.id === fromCurrency)?.code} = 
                {(() => {
                  const fromCurrencyData = currencies.find(c => c.id === fromCurrency);
                  const toCurrencyData = currencies.find(c => c.id === toCurrency);
                  if (!fromCurrencyData || !toCurrencyData) return ' N/A';
                  
                  let rate: number;
                  if (fromCurrencyData.is_default) {
                    rate = toCurrencyData.exchange_rate;
                  } else if (toCurrencyData.is_default) {
                    rate = 1 / fromCurrencyData.exchange_rate;
                  } else {
                    rate = toCurrencyData.exchange_rate / fromCurrencyData.exchange_rate;
                  }
                  
                  return ` ${rate.toFixed(6)} ${toCurrencyData.code}`;
                })()}
                </span>
              )}
            </div>
            
            {/* Fetch Live Rate Button */}
            {!useApiRates && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLiveRate}
                  disabled={!fromCurrency || !toCurrency || fetchingRate || fromCurrency === toCurrency}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${fetchingRate ? 'animate-spin' : ''}`} />
                  {fetchingRate ? 'Fetching...' : 'Get Live Rate'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Test Buttons */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAmount('100')}
            disabled={!fromCurrency || !toCurrency}
          >
            Quick Test with 100
          </Button>
          {useApiRates && (
            <Button
              variant="outline"
              onClick={() => {
                setUseApiRates(false);
                setLiveRate(null);
                toast({
                  title: "Switched to stored rates",
                  description: "Now using the exchange rates stored in your database",
                });
              }}
            >
              Use Stored Rates
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrencyCalculator;
