import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  PaymentMethod,
  PaymentMethodType,
  PaymentStatus,
  Payment,
  PaymentConfirmation,
  DEFAULT_PAYMENT_METHODS
} from '@/types/payment.types';

class PaymentMethodsService {
  private readonly collectionName = 'paymentMethods';
  private readonly paymentsCollection = 'payments';

  /**
   * Encrypt sensitive data (in production, use proper encryption)
   */
  private encryptSensitiveData(data: string): string {
    // In production, use proper encryption library
    // For now, we'll use base64 encoding as a placeholder
    return btoa(data);
  }

  /**
   * Decrypt sensitive data
   */
  private decryptSensitiveData(data: string): string {
    try {
      return atob(data);
    } catch {
      return data;
    }
  }

  /**
   * Get all payment methods for a school
   */
  async getPaymentMethods(schoolId: string): Promise<PaymentMethod[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('schoolId', '==', schoolId),
        orderBy('displayOrder', 'asc'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const methods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as PaymentMethod[];

      // Decrypt sensitive data for Stripe methods
      return methods.map(method => {
        if (method.type === PaymentMethodType.STRIPE && method.stripeSecretKey) {
          return {
            ...method,
            stripeSecretKey: this.decryptSensitiveData(method.stripeSecretKey)
          };
        }
        return method;
      });
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      
      // Handle index not ready error
      if (error?.message?.includes('requires an index')) {
        try {
          const simpleQuery = query(
            collection(db, this.collectionName),
            where('schoolId', '==', schoolId)
          );
          const snapshot = await getDocs(simpleQuery);
          const methods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
          })) as PaymentMethod[];
          
          // Sort client-side
          return methods.sort((a, b) => {
            const orderDiff = (a.displayOrder || 0) - (b.displayOrder || 0);
            if (orderDiff !== 0) return orderDiff;
            return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
          });
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
      }
      
      return [];
    }
  }

  /**
   * Get active payment methods for a school
   */
  async getActivePaymentMethods(schoolId: string): Promise<PaymentMethod[]> {
    const methods = await this.getPaymentMethods(schoolId);
    return methods.filter(m => m.isActive);
  }

  /**
   * Get a single payment method
   */
  async getPaymentMethod(methodId: string): Promise<PaymentMethod | null> {
    try {
      const docRef = doc(db, this.collectionName, methodId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const method = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as PaymentMethod;

        // Decrypt sensitive data
        if (method.type === PaymentMethodType.STRIPE && method.stripeSecretKey) {
          method.stripeSecretKey = this.decryptSensitiveData(method.stripeSecretKey);
        }

        return method;
      }

      return null;
    } catch (error) {
      console.error('Error fetching payment method:', error);
      return null;
    }
  }

  /**
   * Create a new payment method
   */
  async createPaymentMethod(method: Omit<PaymentMethod, 'id'>): Promise<string> {
    try {
      // Encrypt sensitive data
      const methodData = { ...method };
      if (methodData.type === PaymentMethodType.STRIPE && methodData.stripeSecretKey) {
        methodData.stripeSecretKey = this.encryptSensitiveData(methodData.stripeSecretKey);
      }

      // If this is set as default, unset other defaults
      if (methodData.isDefault) {
        await this.unsetDefaultMethods(methodData.schoolId);
      }

      // Get the current max display order
      const existingMethods = await this.getPaymentMethods(methodData.schoolId);
      const maxOrder = Math.max(0, ...existingMethods.map(m => m.displayOrder || 0));

      const docData = {
        ...methodData,
        displayOrder: methodData.displayOrder ?? maxOrder + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collectionName), docData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(methodId: string, updates: Partial<PaymentMethod>): Promise<void> {
    try {
      const updateData = { ...updates };
      
      // Encrypt sensitive data if being updated
      if (updateData.stripeSecretKey) {
        updateData.stripeSecretKey = this.encryptSensitiveData(updateData.stripeSecretKey);
      }

      // If setting as default, unset other defaults
      if (updateData.isDefault && updateData.schoolId) {
        await this.unsetDefaultMethods(updateData.schoolId, methodId);
      }

      updateData.updatedAt = serverTimestamp() as any;

      const docRef = doc(db, this.collectionName, methodId);
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(methodId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, methodId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Unset default status for all methods except the specified one
   */
  private async unsetDefaultMethods(schoolId: string, exceptMethodId?: string): Promise<void> {
    try {
      const methods = await this.getPaymentMethods(schoolId);
      const batch = writeBatch(db);

      methods.forEach(method => {
        if (method.id && method.id !== exceptMethodId && method.isDefault) {
          const docRef = doc(db, this.collectionName, method.id);
          batch.update(docRef, { isDefault: false, updatedAt: serverTimestamp() });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error unsetting default methods:', error);
    }
  }

  /**
   * Initialize default payment methods for a school
   */
  async initializeDefaultMethods(schoolId: string, userId: string): Promise<void> {
    try {
      const existingMethods = await this.getPaymentMethods(schoolId);
      if (existingMethods.length > 0) {
        console.log('Payment methods already exist for school:', schoolId);
        return;
      }

      // Create default bank transfer method
      await this.createPaymentMethod({
        schoolId,
        type: PaymentMethodType.MANUAL,
        name: DEFAULT_PAYMENT_METHODS.BANK_TRANSFER.name,
        description: DEFAULT_PAYMENT_METHODS.BANK_TRANSFER.description,
        instructions: DEFAULT_PAYMENT_METHODS.BANK_TRANSFER.instructions,
        icon: DEFAULT_PAYMENT_METHODS.BANK_TRANSFER.icon,
        isActive: true,
        isDefault: true,
        displayOrder: 1,
        createdBy: userId
      });

      // Create default cash payment method
      await this.createPaymentMethod({
        schoolId,
        type: PaymentMethodType.MANUAL,
        name: DEFAULT_PAYMENT_METHODS.CASH.name,
        description: DEFAULT_PAYMENT_METHODS.CASH.description,
        instructions: DEFAULT_PAYMENT_METHODS.CASH.instructions,
        icon: DEFAULT_PAYMENT_METHODS.CASH.icon,
        isActive: true,
        isDefault: false,
        displayOrder: 2,
        createdBy: userId
      });

      console.log('Default payment methods initialized for school:', schoolId);
    } catch (error) {
      console.error('Error initializing default payment methods:', error);
      throw error;
    }
  }

  /**
   * Create a payment record
   */
  async createPayment(payment: Omit<Payment, 'id'>): Promise<string> {
    try {
      const docData = {
        ...payment,
        status: payment.status || PaymentStatus.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.paymentsCollection), docData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string, 
    status: PaymentStatus, 
    additionalData?: Partial<Payment>
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      if (status === PaymentStatus.PAID && !additionalData?.paidAt) {
        updateData.paidAt = serverTimestamp();
      }

      const docRef = doc(db, this.paymentsCollection, paymentId);
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Confirm a manual payment
   */
  async confirmManualPayment(
    paymentId: string,
    confirmation: Omit<PaymentConfirmation, 'paymentId'>
  ): Promise<void> {
    try {
      const status = confirmation.status === 'approved' 
        ? PaymentStatus.PAID 
        : PaymentStatus.FAILED;

      const updateData: Partial<Payment> = {
        status,
        confirmedBy: confirmation.confirmedBy,
        confirmedAt: confirmation.confirmedAt,
        confirmationNotes: confirmation.notes
      };

      if (status === PaymentStatus.PAID) {
        updateData.paidAt = confirmation.confirmedAt;
      }

      await this.updatePaymentStatus(paymentId, status, updateData);
    } catch (error) {
      console.error('Error confirming manual payment:', error);
      throw error;
    }
  }

  /**
   * Get pending payments for confirmation
   */
  async getPendingPayments(schoolId: string): Promise<Payment[]> {
    try {
      const q = query(
        collection(db, this.paymentsCollection),
        where('schoolId', '==', schoolId),
        where('paymentMethodType', '==', PaymentMethodType.MANUAL),
        where('status', 'in', [PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        paidAt: doc.data().paidAt?.toDate(),
        confirmedAt: doc.data().confirmedAt?.toDate()
      })) as Payment[];
    } catch (error: any) {
      console.error('Error fetching pending payments:', error);
      
      // Handle index error with simpler query
      if (error?.message?.includes('requires an index')) {
        try {
          const simpleQuery = query(
            collection(db, this.paymentsCollection),
            where('schoolId', '==', schoolId),
            where('status', '==', PaymentStatus.PENDING)
          );
          const snapshot = await getDocs(simpleQuery);
          const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            paidAt: doc.data().paidAt?.toDate(),
            confirmedAt: doc.data().confirmedAt?.toDate()
          })) as Payment[];
          
          // Filter client-side
          return payments
            .filter(p => p.paymentMethodType === PaymentMethodType.MANUAL)
            .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
      }
      
      return [];
    }
  }
}

export const paymentMethodsService = new PaymentMethodsService();