import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  startAfter,
  DocumentSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  NotificationLog,
  NotificationLogFilters,
  NotificationLogStats,
  NotificationLogQuery
} from '@/types/notificationLog.types';
import { format, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';

class NotificationLogsService {
  private collectionName = 'notificationLogs';

  // Create a new notification log
  async createLog(log: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...log,
        messagePreview: log.message.substring(0, 100) + (log.message.length > 100 ? '...' : ''),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        sentAt: Timestamp.fromDate(log.sentAt),
        deliveredAt: log.deliveredAt ? Timestamp.fromDate(log.deliveredAt) : null,
        readAt: log.readAt ? Timestamp.fromDate(log.readAt) : null
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification log:', error);
      throw error;
    }
  }

  // Update notification log status (e.g., from Twilio webhook)
  async updateLogStatus(
    logId: string, 
    updates: Partial<Pick<NotificationLog, 'status' | 'deliveredAt' | 'readAt' | 'errorMessage' | 'cost'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, logId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (updates.deliveredAt) {
        updateData.deliveredAt = Timestamp.fromDate(updates.deliveredAt);
      }
      if (updates.readAt) {
        updateData.readAt = Timestamp.fromDate(updates.readAt);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating notification log:', error);
      throw error;
    }
  }

  // Get logs with filtering, sorting, and pagination
  async getLogs(schoolId: string, queryOptions: NotificationLogQuery = {}): Promise<{
    logs: NotificationLog[];
    hasMore: boolean;
    lastDoc?: DocumentSnapshot;
  }> {
    try {
      const {
        filters = {},
        sortBy = 'sentAt',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = queryOptions;

      // Build query constraints
      const constraints: any[] = [
        where('schoolId', '==', schoolId),
        orderBy(sortBy, sortOrder)
      ];

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        constraints.push(where('status', 'in', filters.status));
      }

      if (filters.type && filters.type.length > 0) {
        constraints.push(where('notificationType', 'in', filters.type));
      }

      if (filters.channel && filters.channel.length > 0) {
        constraints.push(where('channel', 'in', filters.channel));
      }

      if (filters.templateId) {
        constraints.push(where('templateId', '==', filters.templateId));
      }

      if (filters.dateRange) {
        const startTimestamp = Timestamp.fromDate(startOfDay(filters.dateRange.start));
        const endTimestamp = Timestamp.fromDate(endOfDay(filters.dateRange.end));
        constraints.push(where('sentAt', '>=', startTimestamp));
        constraints.push(where('sentAt', '<=', endTimestamp));
      }

      // Add limit
      constraints.push(firestoreLimit(limit));

      // Create query
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      const logs: NotificationLog[] = [];
      let lastDoc: DocumentSnapshot | undefined;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const log: NotificationLog = {
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate() || new Date(),
          deliveredAt: data.deliveredAt?.toDate(),
          readAt: data.readAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as NotificationLog;

        // Apply client-side filters for text search
        if (filters.recipientSearch) {
          const searchTerm = filters.recipientSearch.toLowerCase();
          if (
            !log.recipientName.toLowerCase().includes(searchTerm) &&
            !log.recipientPhone.toLowerCase().includes(searchTerm)
          ) {
            return; // Skip this log
          }
        }

        logs.push(log);
        lastDoc = doc;
      });

      return {
        logs,
        hasMore: querySnapshot.size === limit,
        lastDoc
      };
    } catch (error: any) {
      console.error('Error getting notification logs:', error);
      
      // Check if it's an index error and provide helpful message
      if (error?.message?.includes('requires an index')) {
        console.warn('Firebase index is still building. Please wait a few moments and refresh the page.');
        // Return empty logs instead of throwing
        return {
          logs: [],
          hasMore: false
        };
      }
      
      throw error;
    }
  }

  // Get logs statistics
  async getStats(schoolId: string, dateRange?: { start: Date; end: Date }): Promise<NotificationLogStats> {
    try {
      const constraints: any[] = [where('schoolId', '==', schoolId)];

      if (dateRange) {
        const startTimestamp = Timestamp.fromDate(startOfDay(dateRange.start));
        const endTimestamp = Timestamp.fromDate(endOfDay(dateRange.end));
        constraints.push(where('sentAt', '>=', startTimestamp));
        constraints.push(where('sentAt', '<=', endTimestamp));
      }

      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      let totalSent = 0;
      let totalFailed = 0;
      let totalPending = 0;
      let totalDelivered = 0;
      let totalRead = 0;
      let totalCost = 0;
      const costByChannel = { sms: 0, whatsapp: 0 };
      const sentByType = {
        lesson_reminder: 0,
        payment_reminder: 0,
        lesson_cancellation: 0,
        custom: 0
      };
      const sentByDayMap = new Map<string, { count: number; cost: number }>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const log = {
          ...data,
          sentAt: data.sentAt?.toDate() || new Date(),
          cost: data.cost || 0
        } as NotificationLog;

        // Count by status
        switch (log.status) {
          case 'sent':
            totalSent++;
            break;
          case 'failed':
            totalFailed++;
            break;
          case 'pending':
            totalPending++;
            break;
          case 'delivered':
            totalDelivered++;
            break;
          case 'read':
            totalRead++;
            break;
        }

        // Cost calculations
        totalCost += log.cost || 0;
        costByChannel[log.channel] += log.cost || 0;

        // Count by type
        if (sentByType.hasOwnProperty(log.notificationType)) {
          sentByType[log.notificationType]++;
        }

        // Count by day
        const dayKey = format(log.sentAt, 'yyyy-MM-dd');
        const dayData = sentByDayMap.get(dayKey) || { count: 0, cost: 0 };
        dayData.count++;
        dayData.cost += log.cost || 0;
        sentByDayMap.set(dayKey, dayData);
      });

      const totalAttempted = totalSent + totalFailed + totalPending + totalDelivered + totalRead;
      const successRate = totalAttempted > 0 ? ((totalSent + totalDelivered + totalRead) / totalAttempted) * 100 : 0;

      const sentByDay = Array.from(sentByDayMap.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          cost: data.cost
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalSent,
        totalFailed,
        totalPending,
        totalDelivered,
        totalRead,
        totalCost,
        successRate: Math.round(successRate * 100) / 100,
        costByChannel,
        sentByType,
        sentByDay
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  // Export logs to CSV
  async exportToCSV(schoolId: string, filters: NotificationLogFilters = {}): Promise<string> {
    try {
      const { logs } = await this.getLogs(schoolId, { filters, limit: 10000 });
      
      const headers = [
        'Date/Time',
        'Recipient',
        'Phone',
        'Type',
        'Channel', 
        'Status',
        'Cost',
        'Template',
        'Message Preview',
        'Error Message'
      ];

      const rows = logs.map(log => [
        format(log.sentAt, 'yyyy-MM-dd HH:mm:ss'),
        log.recipientName,
        log.recipientPhone,
        log.notificationType,
        log.channel.toUpperCase(),
        log.status,
        log.cost ? `$${log.cost.toFixed(4)}` : '',
        log.templateName || '',
        log.messagePreview,
        log.errorMessage || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting logs to CSV:', error);
      throw error;
    }
  }

  // Get a single log by ID
  async getLog(logId: string): Promise<NotificationLog | null> {
    try {
      const docRef = doc(db, this.collectionName, logId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        sentAt: data.sentAt?.toDate() || new Date(),
        deliveredAt: data.deliveredAt?.toDate(),
        readAt: data.readAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as NotificationLog;
    } catch (error) {
      console.error('Error getting notification log:', error);
      throw error;
    }
  }

  // Resend a failed message
  async resendMessage(logId: string): Promise<void> {
    try {
      // This would integrate with your Twilio service
      // For now, we'll just update the status to pending
      await this.updateLogStatus(logId, {
        status: 'pending',
        errorMessage: undefined
      });
    } catch (error) {
      console.error('Error resending message:', error);
      throw error;
    }
  }

  // Delete old logs (admin only)
  async deleteOldLogs(schoolId: string, olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = subDays(new Date(), olderThanDays);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const q = query(
        collection(db, this.collectionName),
        where('schoolId', '==', schoolId),
        where('sentAt', '<', cutoffTimestamp)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return 0;
      }

      // Batch delete
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting old logs:', error);
      throw error;
    }
  }

  // Real-time listener for logs
  subscribeToLogs(
    schoolId: string,
    queryOptions: NotificationLogQuery = {},
    callback: (logs: NotificationLog[]) => void
  ): () => void {
    const {
      filters = {},
      sortBy = 'sentAt',
      sortOrder = 'desc',
      limit = 50
    } = queryOptions;

    const constraints: any[] = [
      where('schoolId', '==', schoolId),
      orderBy(sortBy, sortOrder),
      firestoreLimit(limit)
    ];

    // Apply basic filters (complex filters will be applied client-side)
    if (filters.status && filters.status.length > 0) {
      constraints.push(where('status', 'in', filters.status));
    }

    if (filters.dateRange) {
      const startTimestamp = Timestamp.fromDate(startOfDay(filters.dateRange.start));
      const endTimestamp = Timestamp.fromDate(endOfDay(filters.dateRange.end));
      constraints.push(where('sentAt', '>=', startTimestamp));
      constraints.push(where('sentAt', '<=', endTimestamp));
    }

    const q = query(collection(db, this.collectionName), ...constraints);

    return onSnapshot(q, (snapshot) => {
      const logs: NotificationLog[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const log: NotificationLog = {
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate() || new Date(),
          deliveredAt: data.deliveredAt?.toDate(),
          readAt: data.readAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as NotificationLog;

        // Apply client-side filters
        let includeLog = true;

        if (filters.recipientSearch) {
          const searchTerm = filters.recipientSearch.toLowerCase();
          if (
            !log.recipientName.toLowerCase().includes(searchTerm) &&
            !log.recipientPhone.toLowerCase().includes(searchTerm)
          ) {
            includeLog = false;
          }
        }

        if (filters.type && filters.type.length > 0 && !filters.type.includes(log.notificationType)) {
          includeLog = false;
        }

        if (filters.channel && filters.channel.length > 0 && !filters.channel.includes(log.channel)) {
          includeLog = false;
        }

        if (includeLog) {
          logs.push(log);
        }
      });

      callback(logs);
    });
  }
}

export const notificationLogsService = new NotificationLogsService();