import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { TelegramMessage } from './telegramMessages.service';

export interface MessageStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  messagesByType: {
    text: number;
    command: number;
    callback: number;
  };
  messagesByDirection: {
    incoming: number;
    outgoing: number;
  };
  messagesOverTime: {
    date: string;
    count: number;
    sent: number;
    received: number;
  }[];
  topStudents: {
    studentId: string;
    studentName: string;
    messageCount: number;
  }[];
  peakHours: {
    hour: number;
    count: number;
  }[];
  responseRate: number;
  averageResponseTime: number; // in minutes
}

export interface DateRange {
  start: Date;
  end: Date;
}

class MessageStatisticsService {
  private readonly messagesCollection = 'telegram_messages';

  /**
   * Get comprehensive message statistics for a school
   */
  async getStatistics(
    schoolId: string,
    dateRange?: DateRange
  ): Promise<MessageStats> {
    try {
      const messages = await this.getMessages(schoolId, dateRange);

      return {
        totalMessages: messages.length,
        sentMessages: messages.filter(m => m.direction === 'outgoing').length,
        receivedMessages: messages.filter(m => m.direction === 'incoming').length,
        messagesByType: this.getMessagesByType(messages),
        messagesByDirection: this.getMessagesByDirection(messages),
        messagesOverTime: this.getMessagesOverTime(messages, dateRange),
        topStudents: await this.getTopStudents(messages),
        peakHours: this.getPeakHours(messages),
        responseRate: this.calculateResponseRate(messages),
        averageResponseTime: this.calculateAverageResponseTime(messages)
      };
    } catch (error) {
      console.error('Error fetching message statistics:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get all messages for a school within date range
   */
  private async getMessages(
    schoolId: string,
    dateRange?: DateRange
  ): Promise<TelegramMessage[]> {
    try {
      let constraints = [
        where('schoolId', '==', schoolId),
        orderBy('sentAt', 'desc')
      ];

      if (dateRange) {
        constraints.push(
          where('sentAt', '>=', Timestamp.fromDate(dateRange.start)),
          where('sentAt', '<=', Timestamp.fromDate(dateRange.end))
        );
      }

      const q = query(collection(db, this.messagesCollection), ...constraints);
      const snapshot = await getDocs(q);

      const messages: TelegramMessage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        } as TelegramMessage);
      });

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Get message count by type
   */
  private getMessagesByType(messages: TelegramMessage[]): {
    text: number;
    command: number;
    callback: number;
  } {
    return {
      text: messages.filter(m => m.messageType === 'text').length,
      command: messages.filter(m => m.messageType === 'command').length,
      callback: messages.filter(m => m.messageType === 'callback').length
    };
  }

  /**
   * Get message count by direction
   */
  private getMessagesByDirection(messages: TelegramMessage[]): {
    incoming: number;
    outgoing: number;
  } {
    return {
      incoming: messages.filter(m => m.direction === 'incoming').length,
      outgoing: messages.filter(m => m.direction === 'outgoing').length
    };
  }

  /**
   * Get messages grouped by date
   */
  private getMessagesOverTime(
    messages: TelegramMessage[],
    dateRange?: DateRange
  ): {
    date: string;
    count: number;
    sent: number;
    received: number;
  }[] {
    const messagesByDate = new Map<string, {
      count: number;
      sent: number;
      received: number;
    }>();

    messages.forEach(message => {
      const dateKey = message.sentAt.toISOString().split('T')[0];

      if (!messagesByDate.has(dateKey)) {
        messagesByDate.set(dateKey, { count: 0, sent: 0, received: 0 });
      }

      const stats = messagesByDate.get(dateKey)!;
      stats.count++;
      if (message.direction === 'outgoing') {
        stats.sent++;
      } else {
        stats.received++;
      }
    });

    // Convert to array and sort by date
    const result = Array.from(messagesByDate.entries())
      .map(([date, stats]) => ({
        date,
        ...stats
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fill in missing dates if date range is provided
    if (dateRange) {
      return this.fillMissingDates(result, dateRange);
    }

    return result;
  }

  /**
   * Fill in missing dates with zero values
   */
  private fillMissingDates(
    data: { date: string; count: number; sent: number; received: number }[],
    dateRange: DateRange
  ): { date: string; count: number; sent: number; received: number }[] {
    const result: { date: string; count: number; sent: number; received: number }[] = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const existing = data.find(d => d.date === dateKey);

      result.push(existing || {
        date: dateKey,
        count: 0,
        sent: 0,
        received: 0
      });

      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * Get top students by message count
   */
  private async getTopStudents(
    messages: TelegramMessage[]
  ): Promise<{
    studentId: string;
    studentName: string;
    messageCount: number;
  }[]> {
    const studentMessageCounts = new Map<string, number>();

    messages.forEach(message => {
      const count = studentMessageCounts.get(message.studentId) || 0;
      studentMessageCounts.set(message.studentId, count + 1);
    });

    // Sort by message count and take top 10
    const sorted = Array.from(studentMessageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Fetch student names (you would need to implement this based on your student service)
    return sorted.map(([studentId, messageCount]) => ({
      studentId,
      studentName: '', // Will be populated by the UI from student data
      messageCount
    }));
  }

  /**
   * Get peak messaging hours
   */
  private getPeakHours(messages: TelegramMessage[]): {
    hour: number;
    count: number;
  }[] {
    const hourCounts = new Map<number, number>();

    messages.forEach(message => {
      const hour = message.sentAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Create array for all 24 hours
    const result: { hour: number; count: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      result.push({
        hour,
        count: hourCounts.get(hour) || 0
      });
    }

    return result;
  }

  /**
   * Calculate response rate (percentage of incoming messages that got a response)
   */
  private calculateResponseRate(messages: TelegramMessage[]): number {
    const sortedMessages = [...messages].sort((a, b) =>
      a.sentAt.getTime() - b.sentAt.getTime()
    );

    let incomingCount = 0;
    let respondedCount = 0;
    let lastIncomingTime: Date | null = null;
    const responseWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    sortedMessages.forEach(message => {
      if (message.direction === 'incoming') {
        incomingCount++;
        lastIncomingTime = message.sentAt;
      } else if (
        message.direction === 'outgoing' &&
        lastIncomingTime &&
        message.sentAt.getTime() - lastIncomingTime.getTime() <= responseWindow
      ) {
        respondedCount++;
        lastIncomingTime = null; // Reset to avoid counting multiple responses
      }
    });

    return incomingCount > 0 ? (respondedCount / incomingCount) * 100 : 0;
  }

  /**
   * Calculate average response time in minutes
   */
  private calculateAverageResponseTime(messages: TelegramMessage[]): number {
    const sortedMessages = [...messages].sort((a, b) =>
      a.sentAt.getTime() - b.sentAt.getTime()
    );

    const responseTimes: number[] = [];
    let lastIncomingTime: Date | null = null;

    sortedMessages.forEach(message => {
      if (message.direction === 'incoming') {
        lastIncomingTime = message.sentAt;
      } else if (
        message.direction === 'outgoing' &&
        lastIncomingTime
      ) {
        const responseTime = message.sentAt.getTime() - lastIncomingTime.getTime();
        responseTimes.push(responseTime);
        lastIncomingTime = null;
      }
    });

    if (responseTimes.length === 0) return 0;

    const averageMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    return Math.round(averageMs / (1000 * 60)); // Convert to minutes
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): MessageStats {
    return {
      totalMessages: 0,
      sentMessages: 0,
      receivedMessages: 0,
      messagesByType: {
        text: 0,
        command: 0,
        callback: 0
      },
      messagesByDirection: {
        incoming: 0,
        outgoing: 0
      },
      messagesOverTime: [],
      topStudents: [],
      peakHours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
      responseRate: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Get common date ranges
   */
  getDateRanges() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      today: {
        start: today,
        end: now
      },
      last7Days: {
        start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now
      },
      last30Days: {
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now
      },
      thisMonth: {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now
      },
      lastMonth: {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      },
      thisYear: {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      }
    };
  }
}

export const messageStatisticsService = new MessageStatisticsService();
