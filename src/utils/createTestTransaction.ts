import { supabase } from '@/integrations/supabase/client';

/**
 * Create a test transaction for today's date
 * This helps test the date filtering functionality
 */
export async function createTestTransaction() {
  // Get today's date (September 4, 2025)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  console.log('Creating test transaction for:', dateStr);
  
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        school_id: 'sET8oQzDBtk9uREAw2Js',
        type: 'income',
        amount: 3500,
        currency: 'RUB',
        transaction_date: dateStr,
        payment_method: 'Cash',
        contact_type: 'student',
        contact_id: 'GuNCwvQTjaIvWmZPAaUE',
        notes: `Test payment for ${dateStr}`,
        status: 'completed',
        to_account_id: 'vpzF6DUsWk2YnfqBT6f0' // Tinkoff account
      });
    
    if (error) {
      console.error('Error creating transaction:', error);
      return false;
    }
    
    console.log('✅ Transaction created successfully:', data);
    console.log('🔄 Please refresh the page to see it in the finances!');
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Make it available globally
(window as any).createTestTransaction = createTestTransaction;
console.log('💡 Test transaction creator available. Run: createTestTransaction()');