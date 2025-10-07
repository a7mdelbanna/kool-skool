import { databaseService } from '@/services/firebase/database.service';

export async function cleanupMaroSubscription() {
  console.log('🔍 Starting cleanup for Maro maro subscription...');

  try {
    // The renewed subscription ID from the logs was: 56gHAHpr2Os6ETPDufiq
    const subscriptionId = '56gHAHpr2Os6ETPDufiq';
    console.log('🎯 Looking for subscription:', subscriptionId);

    // Delete sessions for this subscription
    const sessions = await databaseService.query('sessions', {
      where: [{ field: 'subscriptionId', operator: '==', value: subscriptionId }]
    });

    console.log(`🗑️ Found ${sessions.length} sessions with subscriptionId to delete`);

    for (const session of sessions) {
      await databaseService.delete('sessions', session.id);
      console.log(`  ✅ Deleted session: ${session.id}`);
    }

    // Also check for sessions with subscription_id field (snake_case)
    const sessions2 = await databaseService.query('sessions', {
      where: [{ field: 'subscription_id', operator: '==', value: subscriptionId }]
    });

    console.log(`🗑️ Found ${sessions2.length} sessions with subscription_id to delete`);

    for (const session of sessions2) {
      await databaseService.delete('sessions', session.id);
      console.log(`  ✅ Deleted session (snake_case): ${session.id}`);
    }

    // Delete any payments for this subscription
    const payments = await databaseService.query('payments', {
      where: [{ field: 'subscription_id', operator: '==', value: subscriptionId }]
    });

    console.log(`💰 Found ${payments.length} payments to delete`);

    for (const payment of payments) {
      await databaseService.delete('payments', payment.id);
      console.log(`  ✅ Deleted payment: ${payment.id}`);
    }

    // Delete any transactions for this subscription
    const transactions = await databaseService.query('transactions', {
      where: [{ field: 'subscription_id', operator: '==', value: subscriptionId }]
    });

    console.log(`📊 Found ${transactions.length} transactions to delete`);

    for (const transaction of transactions) {
      await databaseService.delete('transactions', transaction.id);
      console.log(`  ✅ Deleted transaction: ${transaction.id}`);
    }

    // Finally, delete the subscription itself
    await databaseService.delete('subscriptions', subscriptionId);
    console.log(`🎉 Deleted subscription: ${subscriptionId}`);

    console.log('✅ Cleanup completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return { success: false, error };
  }
}

// Make it available in the window for easy execution
if (typeof window !== 'undefined') {
  (window as any).cleanupMaroSubscription = cleanupMaroSubscription;
}