import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp,
  limit as firestoreLimit,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

export interface TelegramMessage {
  id?: string;
  schoolId: string;
  studentId: string;
  chatId: string;
  direction: 'incoming' | 'outgoing';
  messageText: string;
  messageType: 'text' | 'command' | 'callback' | 'photo' | 'document' | 'video' | 'audio';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metadata?: {
    commandName?: string;
    callbackData?: string;
    botResponse?: string;
    fileId?: string;
    thumbnailUrl?: string;
  };
  sentAt: Date;
  createdAt?: Date;
}

export interface ChatSummary {
  studentId: string;
  studentName: string;
  chatId: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

class TelegramMessagesService {
  private readonly messagesCollection = 'telegram_messages';

  /**
   * Get all messages for a specific chat
   */
  async getChatMessages(
    schoolId: string,
    studentId: string,
    limit: number = 50
  ): Promise<TelegramMessage[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('schoolId', '==', schoolId),
        where('studentId', '==', studentId),
        orderBy('sentAt', 'desc'),
        firestoreLimit(limit)
      ];

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

      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  /**
   * Send a message to a student (uses Cloud Function to send and store)
   */
  async sendMessage(
    schoolId: string,
    studentId: string,
    messageText: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sendMessageFunction = httpsCallable(functions, 'sendTelegramAdminMessage');

      const result = await sendMessageFunction({
        schoolId,
        studentId,
        message: messageText
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  /**
   * Subscribe to real-time message updates for a chat
   */
  subscribeToChat(
    schoolId: string,
    studentId: string,
    callback: (messages: TelegramMessage[]) => void,
    limit: number = 50
  ): () => void {
    try {
      const constraints: QueryConstraint[] = [
        where('schoolId', '==', schoolId),
        where('studentId', '==', studentId),
        orderBy('sentAt', 'desc'),
        firestoreLimit(limit)
      ];

      const q = query(collection(db, this.messagesCollection), ...constraints);

      return onSnapshot(q, (snapshot) => {
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

        // Return in chronological order (oldest first)
        callback(messages.reverse());
      });
    } catch (error) {
      console.error('Error subscribing to chat:', error);
      return () => {};
    }
  }

  /**
   * Get chat summaries for all students with Telegram linked
   */
  async getChatSummaries(schoolId: string): Promise<ChatSummary[]> {
    try {
      // Get all messages, grouped by student
      const q = query(
        collection(db, this.messagesCollection),
        where('schoolId', '==', schoolId),
        orderBy('sentAt', 'desc')
      );

      const snapshot = await getDocs(q);

      // Group messages by studentId and get the latest
      const studentChats = new Map<string, TelegramMessage>();

      snapshot.forEach(doc => {
        const data = doc.data();
        const message = {
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        } as TelegramMessage;

        if (!studentChats.has(message.studentId)) {
          studentChats.set(message.studentId, message);
        }
      });

      // Convert to chat summaries (we'll need to fetch student names separately)
      const summaries: ChatSummary[] = [];

      for (const [studentId, lastMessage] of studentChats.entries()) {
        summaries.push({
          studentId,
          studentName: '', // Will be populated by the UI from student data
          chatId: lastMessage.chatId,
          lastMessage: lastMessage.messageText,
          lastMessageAt: lastMessage.sentAt,
          unreadCount: 0 // TODO: Implement read tracking
        });
      }

      return summaries.sort((a, b) =>
        b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      );
    } catch (error) {
      console.error('Error fetching chat summaries:', error);
      return [];
    }
  }
}

export const telegramMessagesService = new TelegramMessagesService();
