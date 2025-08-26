// Currency Exchange Rate API Service
// Using exchangerate-api.com for free tier (no API key required for basic usage)

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: { [key: string]: number };
  time_last_update_utc: string;
}

class CurrencyApiService {
  private baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  private cache: Map<string, { data: ExchangeRateResponse; timestamp: number }> = new Map();
  private cacheExpiry = 3600000; // 1 hour in milliseconds

  // Get exchange rates for a base currency
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<{ [key: string]: number }> {
    try {
      // Check cache first
      const cached = this.cache.get(baseCurrency);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log(`Using cached exchange rates for ${baseCurrency}`);
        return cached.data.conversion_rates || {};
      }

      console.log(`Fetching exchange rates for ${baseCurrency} from API`);
      const response = await fetch(`${this.baseUrl}/${baseCurrency}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(baseCurrency, {
        data: data,
        timestamp: Date.now()
      });

      return data.rates || {};
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      
      // Return some default rates as fallback
      return this.getFallbackRates(baseCurrency);
    }
  }

  // Get exchange rate between two currencies
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      if (fromCurrency === toCurrency) return 1;

      const rates = await this.getExchangeRates(fromCurrency);
      return rates[toCurrency] || 1;
    } catch (error) {
      console.error(`Error getting exchange rate from ${fromCurrency} to ${toCurrency}:`, error);
      return 1;
    }
  }

  // Convert amount from one currency to another
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  // Get list of supported currencies
  getSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
      { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
      { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
      { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
      { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
      { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
      { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
      { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
      { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
      { code: 'COP', name: 'Colombian Peso', symbol: '$' }
    ];
  }

  // Fallback rates if API is unavailable (approximate rates as of 2024)
  private getFallbackRates(baseCurrency: string): { [key: string]: number } {
    // Basic fallback rates relative to USD
    const usdRates: { [key: string]: number } = {
      'USD': 1,
      'EUR': 0.92,
      'GBP': 0.79,
      'JPY': 150,
      'CNY': 7.2,
      'AUD': 1.52,
      'CAD': 1.36,
      'CHF': 0.88,
      'HKD': 7.83,
      'SGD': 1.34,
      'SEK': 10.5,
      'NOK': 10.6,
      'NZD': 1.63,
      'MXN': 17.1,
      'INR': 83.2,
      'RUB': 92.5,
      'BRL': 4.97,
      'ZAR': 18.7,
      'KRW': 1325,
      'TRY': 32.5,
      'AED': 3.67,
      'SAR': 3.75,
      'PLN': 4.0,
      'THB': 35.5,
      'IDR': 15650,
      'MYR': 4.7,
      'PHP': 56.5,
      'CZK': 23.0,
      'DKK': 6.85,
      'HUF': 355,
      'ILS': 3.7,
      'CLP': 970,
      'EGP': 30.9,
      'PKR': 280,
      'VND': 24500,
      'NGN': 820,
      'BGN': 1.8,
      'RON': 4.57,
      'UAH': 38.5,
      'ARS': 850,
      'COP': 4000
    };

    if (baseCurrency === 'USD') {
      return usdRates;
    }

    // Convert rates to be relative to the base currency
    const baseRate = usdRates[baseCurrency] || 1;
    const convertedRates: { [key: string]: number } = {};
    
    for (const [currency, rate] of Object.entries(usdRates)) {
      convertedRates[currency] = rate / baseRate;
    }
    
    return convertedRates;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const currencyApiService = new CurrencyApiService();
export default currencyApiService;