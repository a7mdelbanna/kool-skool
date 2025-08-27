/**
 * Twilio configuration validation utilities
 */

export interface TwilioValidationError {
  field: string;
  message: string;
  suggestions?: string[];
}

export interface TwilioValidationResult {
  isValid: boolean;
  errors: TwilioValidationError[];
}

/**
 * Validate Twilio Account SID format
 * Must start with "AC" followed by 32 alphanumeric characters
 */
export function validateAccountSid(accountSid: string): TwilioValidationError | null {
  if (!accountSid) {
    return {
      field: 'accountSid',
      message: 'Account SID is required',
      suggestions: ['Enter your Account SID from the Twilio Console']
    };
  }

  const suggestions = getAccountSidSuggestions(accountSid);
  
  if (accountSid.length !== 34) {
    return {
      field: 'accountSid',
      message: 'Account SID must be exactly 34 characters long',
      suggestions
    };
  }

  if (!accountSid.startsWith('AC')) {
    return {
      field: 'accountSid',
      message: 'Account SID must start with "AC"',
      suggestions
    };
  }

  // Check if the remaining 32 characters are alphanumeric
  const remainingChars = accountSid.slice(2);
  if (!/^[a-zA-Z0-9]{32}$/.test(remainingChars)) {
    return {
      field: 'accountSid',
      message: 'Account SID must contain only letters and numbers after "AC"',
      suggestions
    };
  }

  return null;
}

/**
 * Validate Twilio Auth Token format
 * Should be 32 characters long and alphanumeric
 */
export function validateAuthToken(authToken: string): TwilioValidationError | null {
  if (!authToken) {
    return {
      field: 'authToken',
      message: 'Auth Token is required'
    };
  }

  if (authToken.length !== 32) {
    return {
      field: 'authToken',
      message: 'Auth Token must be exactly 32 characters long'
    };
  }

  if (!/^[a-zA-Z0-9]{32}$/.test(authToken)) {
    return {
      field: 'authToken',
      message: 'Auth Token must contain only letters and numbers'
    };
  }

  return null;
}

/**
 * Validate phone number format
 * Must start with + followed by country code and number
 * Now optional - only validates format if provided
 */
export function validatePhoneNumber(phoneNumber: string, fieldName: string, isRequired: boolean = false): TwilioValidationError | null {
  if (!phoneNumber) {
    if (isRequired) {
      return {
        field: fieldName,
        message: 'Phone number is required',
        suggestions: ['Enter a phone number with country code (e.g., +1234567890)']
      };
    }
    // Return null if not required and empty
    return null;
  }

  const suggestions = getPhoneNumberSuggestions(phoneNumber, fieldName);

  if (!phoneNumber.startsWith('+')) {
    return {
      field: fieldName,
      message: 'Phone number must start with + followed by country code',
      suggestions
    };
  }

  // Remove the + and check if remaining characters are digits
  const digits = phoneNumber.slice(1);
  if (!/^\d{10,15}$/.test(digits)) {
    return {
      field: fieldName,
      message: 'Phone number must contain 10-15 digits after country code',
      suggestions
    };
  }

  return null;
}

/**
 * Validate WhatsApp phone number format
 * Can optionally start with "whatsapp:" prefix
 * Now optional - only validates format if provided
 */
export function validateWhatsAppNumber(whatsappNumber: string, isRequired: boolean = false): TwilioValidationError | null {
  if (!whatsappNumber) {
    if (isRequired) {
      return {
        field: 'phoneNumberWhatsapp',
        message: 'WhatsApp number is required',
        suggestions: ['Enter a WhatsApp-enabled phone number (e.g., +1234567890 or whatsapp:+1234567890)']
      };
    }
    // Return null if not required and empty
    return null;
  }

  let phoneNumber = whatsappNumber;
  
  // Remove whatsapp: prefix if present
  if (whatsappNumber.startsWith('whatsapp:')) {
    phoneNumber = whatsappNumber.replace('whatsapp:', '');
  }

  const suggestions = getPhoneNumberSuggestions(phoneNumber, 'phoneNumberWhatsapp');

  // Validate the phone number part (not required since we already checked above)
  const phoneError = validatePhoneNumber(phoneNumber, 'phoneNumberWhatsapp', false);
  if (phoneError) {
    return {
      field: 'phoneNumberWhatsapp',
      message: phoneError.message.replace('Phone number', 'WhatsApp number'),
      suggestions
    };
  }

  return null;
}

/**
 * Validate monthly budget
 */
export function validateMonthlyBudget(budget: number): TwilioValidationError | null {
  if (budget < 0) {
    return {
      field: 'monthlyBudget',
      message: 'Monthly budget cannot be negative',
      suggestions: ['Enter a positive number or 0 for no budget limit']
    };
  }

  if (budget > 10000) {
    return {
      field: 'monthlyBudget',
      message: 'Monthly budget cannot exceed $10,000',
      suggestions: ['Enter a value between 0 and 10,000']
    };
  }

  return null;
}

/**
 * Validate complete Twilio configuration
 * Phone numbers are now optional - only validates format if provided
 */
export function validateTwilioConfig(config: {
  accountSid: string;
  authToken: string;
  phoneNumberSms: string;
  phoneNumberWhatsapp: string;
  monthlyBudget: number;
}): TwilioValidationResult {
  const errors: TwilioValidationError[] = [];

  // Validate Account SID (required)
  const accountSidError = validateAccountSid(config.accountSid);
  if (accountSidError) {
    errors.push(accountSidError);
  }

  // Validate Auth Token (required)
  const authTokenError = validateAuthToken(config.authToken);
  if (authTokenError) {
    errors.push(authTokenError);
  }

  // Validate SMS phone number (optional - only validate format if provided)
  if (config.phoneNumberSms) {
    const smsNumberError = validatePhoneNumber(config.phoneNumberSms, 'phoneNumberSms', false);
    if (smsNumberError) {
      errors.push(smsNumberError);
    }
  }

  // Validate WhatsApp number (optional - only validate format if provided)
  if (config.phoneNumberWhatsapp) {
    const whatsappNumberError = validateWhatsAppNumber(config.phoneNumberWhatsapp, false);
    if (whatsappNumberError) {
      errors.push(whatsappNumberError);
    }
  }

  // Note: Phone numbers are now completely optional
  // Users can save just their credentials and add phone numbers later

  // Validate monthly budget
  const budgetError = validateMonthlyBudget(config.monthlyBudget);
  if (budgetError) {
    errors.push(budgetError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format phone number for WhatsApp (adds whatsapp: prefix if not present)
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  if (phoneNumber.startsWith('whatsapp:')) {
    return phoneNumber;
  }
  
  return `whatsapp:${phoneNumber}`;
}

/**
 * Check if a string looks like it might be base64 encoded
 * (common issue when Account SID gets encoded)
 */
export function isLikelyEncoded(value: string): boolean {
  // Check if it looks like base64 (contains typical base64 characters and doesn't start with AC)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && !value.startsWith('AC') && value.length > 34;
}

/**
 * Attempt to decode a potentially encoded Account SID
 */
export function tryDecodeAccountSid(encodedValue: string): string | null {
  try {
    // Try base64 decoding
    const decoded = atob(encodedValue);
    
    // Check if the decoded value looks like a valid Account SID
    if (decoded.startsWith('AC') && decoded.length === 34) {
      return decoded;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get suggestions for fixing common Account SID issues
 */
export function getAccountSidSuggestions(accountSid: string): string[] {
  const suggestions: string[] = [];
  
  if (!accountSid) {
    suggestions.push('Enter your Account SID from the Twilio Console');
    return suggestions;
  }
  
  // Check if it might be encoded
  if (isLikelyEncoded(accountSid)) {
    suggestions.push('This appears to be encoded. Please enter the original Account SID from Twilio Console');
    
    const decoded = tryDecodeAccountSid(accountSid);
    if (decoded) {
      suggestions.push(`Did you mean: ${decoded}?`);
    }
  }
  
  // Check length issues
  if (accountSid.length !== 34) {
    if (accountSid.length < 34) {
      suggestions.push('Account SID is too short. It should be exactly 34 characters');
    } else {
      suggestions.push('Account SID is too long. It should be exactly 34 characters');
    }
  }
  
  // Check format issues
  if (!accountSid.startsWith('AC') && accountSid.length >= 2) {
    suggestions.push('Account SID must start with "AC"');
  }
  
  // Check for common typos
  if (accountSid.startsWith('ac')) {
    suggestions.push('Account SID should use uppercase "AC", not lowercase');
  }
  
  if (accountSid.includes(' ')) {
    suggestions.push('Remove any spaces from the Account SID');
  }
  
  return suggestions;
}

/**
 * Get user-friendly validation messages
 */
export function getFieldValidationMessage(fieldName: string): string {
  const messages: Record<string, string> = {
    accountSid: 'Account SID must start with "AC" followed by 32 characters (e.g., ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)',
    authToken: 'Auth Token must be exactly 32 alphanumeric characters',
    phoneNumberSms: 'Optional: SMS number must include country code (e.g., +1234567890)',
    phoneNumberWhatsapp: 'Optional: WhatsApp number must include country code (e.g., +1234567890 or whatsapp:+1234567890)',
    monthlyBudget: 'Budget must be a positive number less than $10,000'
  };
  
  return messages[fieldName] || 'Invalid format';
}

/**
 * Clean and normalize phone number format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^+\d]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate and suggest corrections for phone numbers
 */
export function getPhoneNumberSuggestions(phoneNumber: string, fieldName: string): string[] {
  const suggestions: string[] = [];
  
  if (!phoneNumber) {
    suggestions.push('Enter a phone number with country code');
    return suggestions;
  }
  
  if (!phoneNumber.startsWith('+')) {
    const normalized = normalizePhoneNumber(phoneNumber);
    suggestions.push(`Did you mean: ${normalized}?`);
  }
  
  if (phoneNumber.includes(' ') || phoneNumber.includes('-') || phoneNumber.includes('(')) {
    const normalized = normalizePhoneNumber(phoneNumber);
    suggestions.push(`Cleaned format: ${normalized}`);
  }
  
  return suggestions;
}

/**
 * Check if a Twilio configuration supports a specific channel
 */
export function isChannelConfigured(config: {
  phoneNumberSms?: string;
  phoneNumberWhatsapp?: string;
}, channel: 'sms' | 'whatsapp'): boolean {
  if (channel === 'sms') {
    return !!(config.phoneNumberSms && config.phoneNumberSms.trim());
  } else {
    return !!(config.phoneNumberWhatsapp && config.phoneNumberWhatsapp.trim());
  }
}

/**
 * Get available channels based on configuration
 */
export function getAvailableChannels(config: {
  phoneNumberSms?: string;
  phoneNumberWhatsapp?: string;
}): ('sms' | 'whatsapp')[] {
  const channels: ('sms' | 'whatsapp')[] = [];
  
  if (isChannelConfigured(config, 'sms')) {
    channels.push('sms');
  }
  
  if (isChannelConfigured(config, 'whatsapp')) {
    channels.push('whatsapp');
  }
  
  return channels;
}

/**
 * Get configuration status summary
 */
export function getConfigurationStatus(config: {
  accountSid?: string;
  authToken?: string;
  phoneNumberSms?: string;
  phoneNumberWhatsapp?: string;
  isActive?: boolean;
}): {
  hasCredentials: boolean;
  hasSMS: boolean;
  hasWhatsApp: boolean;
  isFullyConfigured: boolean;
  statusMessage: string;
} {
  const hasCredentials = !!(config.accountSid && config.authToken);
  const hasSMS = isChannelConfigured(config, 'sms');
  const hasWhatsApp = isChannelConfigured(config, 'whatsapp');
  const isFullyConfigured = hasCredentials && (hasSMS || hasWhatsApp) && config.isActive;
  
  let statusMessage = '';
  if (!hasCredentials) {
    statusMessage = 'Twilio credentials required';
  } else if (!hasSMS && !hasWhatsApp) {
    statusMessage = 'Phone numbers required for messaging';
  } else if (!config.isActive) {
    statusMessage = 'Integration disabled';
  } else {
    statusMessage = 'Fully configured';
  }
  
  return {
    hasCredentials,
    hasSMS,
    hasWhatsApp,
    isFullyConfigured,
    statusMessage
  };
}