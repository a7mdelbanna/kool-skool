// Payment Method Types
export enum PaymentMethodType {
  MANUAL = 'manual',
  STRIPE = 'stripe',
  PAYPAL = 'paypal', // Future expansion
  RAZORPAY = 'razorpay' // Future expansion
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface PaymentMethod {
  id?: string;
  schoolId: string;
  type: PaymentMethodType;
  name: string; // e.g., "Bank Transfer", "Credit Card"
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  
  // For manual payment methods
  instructions?: string; // Detailed payment instructions
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  routingNumber?: string;
  swiftCode?: string;
  additionalInfo?: string;
  
  // For automatic payment methods (Stripe)
  stripePublishableKey?: string;
  stripeSecretKey?: string; // Encrypted
  stripeWebhookSecret?: string; // For webhook validation
  
  // Display settings
  icon?: string; // Icon name or URL
  color?: string; // Brand color
  displayOrder?: number;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

export interface Payment {
  id?: string;
  schoolId: string;
  studentId: string;
  teacherId?: string;
  
  // Payment details
  amount: number;
  currency: string;
  description: string;
  dueDate: Date;
  
  // Payment method
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodType: PaymentMethodType;
  
  // Status
  status: PaymentStatus;
  paidAt?: Date;
  
  // For manual payments
  proofUrl?: string; // Receipt/proof upload
  confirmedBy?: string; // Admin/teacher who confirmed
  confirmedAt?: Date;
  confirmationNotes?: string;
  
  // For automatic payments
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeReceiptUrl?: string;
  
  // Notification tracking
  remindersSent?: {
    [key: string]: Date;
  };
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
}

export interface PaymentConfirmation {
  paymentId: string;
  confirmedBy: string;
  confirmedAt: Date;
  status: 'approved' | 'rejected';
  notes?: string;
  
  // If rejected
  rejectionReason?: string;
  requiresResubmission?: boolean;
}

export interface PaymentReminder {
  id?: string;
  paymentId: string;
  sentAt: Date;
  sentTo: string; // Phone number or email
  channel: 'sms' | 'whatsapp' | 'email';
  message: string;
  status: 'sent' | 'failed';
  error?: string;
}

// Stripe specific types
export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret?: string;
  testMode: boolean;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
  metadata: {
    paymentId: string;
    studentId: string;
    schoolId: string;
  };
}

// Helper types for UI
export interface PaymentMethodFormData {
  type: PaymentMethodType;
  name: string;
  description?: string;
  
  // Manual payment fields
  instructions?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  
  // Stripe fields
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  testMode?: boolean;
}

export interface PaymentSummary {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  recentPayments: Payment[];
  upcomingPayments: Payment[];
}

// Default payment method templates
export const DEFAULT_PAYMENT_METHODS = {
  BANK_TRANSFER: {
    type: PaymentMethodType.MANUAL,
    name: 'Bank Transfer',
    icon: 'bank',
    description: 'Direct bank transfer',
    instructions: 'Please transfer the amount to the following account and send proof of payment.'
  },
  CASH: {
    type: PaymentMethodType.MANUAL,
    name: 'Cash Payment',
    icon: 'cash',
    description: 'Pay in cash',
    instructions: 'Please pay in cash to your teacher and request a receipt.'
  },
  STRIPE: {
    type: PaymentMethodType.STRIPE,
    name: 'Credit/Debit Card',
    icon: 'credit-card',
    description: 'Pay securely with card via Stripe'
  }
};