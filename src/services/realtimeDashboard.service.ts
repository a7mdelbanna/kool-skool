import {
  onSnapshot,
  query,
  where,
  orderBy,
  collection,
  Timestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { differenceInDays, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';
import { getStudentsWithDetails, getStudentLessonSessions } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';

export interface RealtimeMetrics {
  totalRevenue: number;
  todayRevenue: number;
  activeStudents: number;
  todaySessions: number;
  pendingPayments: number;
  urgentTasks: number;
  lastUpdated: Date;
}

export interface RealtimeUpdate {
  type: 'payment' | 'session' | 'student' | 'todo' | 'attendance';
  action: 'added' | 'modified' | 'removed';
  data: any;
  timestamp: Date;
}

type UpdateCallback = (metrics: RealtimeMetrics) => void;
type EventCallback = (update: RealtimeUpdate) => void;

class RealtimeDashboardService {
  private subscriptions: Map<string, Unsubscribe> = new Map();
  private metricsCallbacks: Set<UpdateCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private currentMetrics: RealtimeMetrics = {
    totalRevenue: 0,
    todayRevenue: 0,
    activeStudents: 0,
    todaySessions: 0,
    pendingPayments: 0,
    urgentTasks: 0,
    lastUpdated: new Date()
  };
  private isListening = false;

  /**
   * Start listening to real-time updates for a school
   */
  startListening(schoolId: string): void {
    if (this.isListening) {
      console.log('Already listening to realtime updates');
      return;
    }

    this.isListening = true;
    console.log('🔴 Starting real-time dashboard monitoring for school:', schoolId);

    // Listen to payments collection
    this.listenToPayments(schoolId);

    // Listen to sessions collection
    this.listenToSessions(schoolId);

    // Listen to students collection
    this.listenToStudents(schoolId);

    // Listen to todos collection
    this.listenToTodos(schoolId);

    // Listen to transactions for revenue updates
    this.listenToTransactions(schoolId);
  }

  /**
   * Stop all real-time listeners
   */
  stopListening(): void {
    console.log('🔵 Stopping real-time dashboard monitoring');

    // Unsubscribe from all listeners
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();

    // Clear callbacks
    this.metricsCallbacks.clear();
    this.eventCallbacks.clear();

    this.isListening = false;
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: UpdateCallback): () => void {
    this.metricsCallbacks.add(callback);

    // Immediately send current metrics
    callback(this.currentMetrics);

    // Return unsubscribe function
    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to real-time events
   */
  onEventUpdate(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Listen to payments collection
   */
  private listenToPayments(schoolId: string): void {
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('school_id', '==', schoolId),
      where('status', '==', 'pending'),
      orderBy('due_date', 'asc')
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      this.handlePaymentsUpdate(snapshot);
    }, (error) => {
      console.error('Error listening to payments:', error);
    });

    this.subscriptions.set('payments', unsubscribe);
  }

  /**
   * Listen to today's sessions
   * NOTE: Sessions are stored in Supabase, not Firebase
   * We need to fetch them from Supabase using the hybrid approach
   */
  private async listenToSessions(schoolId: string): Promise<void> {
    // Fetch sessions from Supabase using the same approach as EnhancedDashboardHeader
    await this.fetchTodaysSessions(schoolId);

    // Set up interval to refresh sessions every 30 seconds
    const intervalId = setInterval(async () => {
      await this.fetchTodaysSessions(schoolId);
    }, 30000); // Refresh every 30 seconds

    // Store cleanup function
    const cleanup = () => clearInterval(intervalId);
    this.subscriptions.set('sessions', cleanup);
  }

  /**
   * Fetch today's sessions from Supabase
   * Uses the same hybrid approach as EnhancedDashboardHeader
   */
  private async fetchTodaysSessions(schoolId: string): Promise<void> {
    try {
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Step 1: Get all students from Firebase
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });

      if (!students || students.length === 0) {
        this.currentMetrics.todaySessions = 0;
        this.notifyMetricsUpdate();
        return;
      }

      // Step 2: Fetch sessions from Supabase for each student
      const studentIds = students.map((s: any) => s.id);
      const allSessions = await Promise.all(
        studentIds.map(async (studentId) => {
          try {
            const sessions = await getStudentLessonSessions(studentId);
            return sessions || [];
          } catch (error) {
            console.error(`Failed to fetch sessions for student ${studentId}:`, error);
            return [];
          }
        })
      );

      // Step 3: Flatten and filter for today's non-cancelled sessions
      const flatSessions = allSessions.flat();
      const todaysSessions = flatSessions.filter((session: any) => {
        // Use scheduled_datetime if available, otherwise use scheduled_date
        let sessionDate: Date;

        if (session.scheduled_datetime) {
          sessionDate = new Date(session.scheduled_datetime);
        } else if (session.scheduled_date) {
          sessionDate = new Date(session.scheduled_date);
        } else {
          return false;
        }

        // Check if session is today and not cancelled
        return sessionDate >= todayStart &&
               sessionDate <= todayEnd &&
               session.status !== 'cancelled';
      });

      // Update metrics
      this.currentMetrics.todaySessions = todaysSessions.length;
      this.notifyMetricsUpdate();

      console.log(`📊 Today's sessions count updated: ${todaysSessions.length}`);
    } catch (error) {
      console.error('Error fetching today\'s sessions from Supabase:', error);
      this.currentMetrics.todaySessions = 0;
      this.notifyMetricsUpdate();
    }
  }

  /**
   * Listen to students collection
   */
  private listenToStudents(schoolId: string): void {
    const studentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    );

    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      this.handleStudentsUpdate(snapshot);
    }, (error) => {
      console.error('Error listening to students:', error);
    });

    this.subscriptions.set('students', unsubscribe);
  }

  /**
   * Listen to todos collection
   */
  private listenToTodos(schoolId: string): void {
    const todosQuery = query(
      collection(db, 'todos'),
      where('school_id', '==', schoolId),
      where('status', 'in', ['pending', 'in_progress'])
    );

    const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
      this.handleTodosUpdate(snapshot);
    }, (error) => {
      console.error('Error listening to todos:', error);
    });

    this.subscriptions.set('todos', unsubscribe);
  }

  /**
   * Listen to transactions for revenue tracking
   */
  private listenToTransactions(schoolId: string): void {
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('school_id', '==', schoolId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
      this.handleTransactionsUpdate(snapshot);
    }, (error) => {
      console.error('Error listening to transactions:', error);
    });

    this.subscriptions.set('transactions', unsubscribe);
  }

  /**
   * Handle payments update
   */
  private handlePaymentsUpdate(snapshot: QuerySnapshot<DocumentData>): void {
    let pendingCount = 0;
    const now = new Date();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dueDate = data.due_date?.toDate() || new Date(data.payment_date);

      if (dueDate < now) {
        pendingCount++;
      }
    });

    // Update metrics
    this.currentMetrics.pendingPayments = pendingCount;
    this.notifyMetricsUpdate();

    // Notify about changes
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const update: RealtimeUpdate = {
        type: 'payment',
        action: change.type as 'added' | 'modified' | 'removed',
        data: { id: change.doc.id, ...data },
        timestamp: new Date()
      };
      this.notifyEventUpdate(update);
    });
  }

  /**
   * Handle sessions update
   * NOTE: This method is deprecated as sessions are now fetched from Supabase
   * Kept for backward compatibility but not used
   */
  private handleSessionsUpdate(snapshot: QuerySnapshot<DocumentData>): void {
    // This method is no longer used since sessions are in Supabase
    console.warn('handleSessionsUpdate called but sessions are in Supabase, not Firebase');
  }

  /**
   * Handle students update
   */
  private handleStudentsUpdate(snapshot: QuerySnapshot<DocumentData>): void {
    let activeCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'active' || !data.status) {
        activeCount++;
      }
    });

    this.currentMetrics.activeStudents = activeCount;
    this.notifyMetricsUpdate();

    // Notify about changes
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const update: RealtimeUpdate = {
          type: 'student',
          action: 'added',
          data: { id: change.doc.id, ...data },
          timestamp: new Date()
        };
        this.notifyEventUpdate(update);
      }
    });
  }

  /**
   * Handle todos update
   */
  private handleTodosUpdate(snapshot: QuerySnapshot<DocumentData>): void {
    let urgentCount = 0;
    const now = new Date();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dueDate = data.due_date?.toDate();

      if (dueDate && dueDate < now) {
        urgentCount++;
      }
    });

    this.currentMetrics.urgentTasks = urgentCount;
    this.notifyMetricsUpdate();

    // Notify about changes
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const update: RealtimeUpdate = {
        type: 'todo',
        action: change.type as 'added' | 'modified' | 'removed',
        data: { id: change.doc.id, ...data },
        timestamp: new Date()
      };
      this.notifyEventUpdate(update);
    });
  }

  /**
   * Handle transactions update for revenue
   */
  private handleTransactionsUpdate(snapshot: QuerySnapshot<DocumentData>): void {
    let totalRevenue = 0;
    let todayRevenue = 0;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'income') {
        const amount = Number(data.amount) || 0;
        totalRevenue += amount;

        const transactionDate = data.date?.toDate() || new Date(data.date);
        if (transactionDate >= todayStart && transactionDate <= todayEnd) {
          todayRevenue += amount;
        }
      }
    });

    this.currentMetrics.totalRevenue = totalRevenue;
    this.currentMetrics.todayRevenue = todayRevenue;
    this.notifyMetricsUpdate();
  }

  /**
   * Notify all metrics callbacks
   */
  private notifyMetricsUpdate(): void {
    this.currentMetrics.lastUpdated = new Date();
    this.metricsCallbacks.forEach(callback => {
      callback({ ...this.currentMetrics });
    });
  }

  /**
   * Notify all event callbacks
   */
  private notifyEventUpdate(update: RealtimeUpdate): void {
    this.eventCallbacks.forEach(callback => {
      callback(update);
    });
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): RealtimeMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Manually refresh all metrics
   */
  async refreshMetrics(): Promise<void> {
    // This would trigger a manual refresh of all queries
    // For now, we rely on the real-time listeners
    console.log('Manual metrics refresh requested');
  }
}

// Export singleton instance
export const realtimeDashboardService = new RealtimeDashboardService();