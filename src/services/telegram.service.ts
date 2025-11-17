import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { notificationLogsService } from './notificationLogs.service';
import { studentsService, FirebaseStudent } from './firebase/students.service';

export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  isActive: boolean;
  defaultLanguage: 'en' | 'ru';
  reminderTimings: {
    lessonReminder: string; // e.g., "2 hours", "1 day"
    subscriptionExpiry: string; // e.g., "7 days"
  };
  updatedAt?: any;
}

export interface TelegramSettings {
  schoolId: string;
  enabled: boolean;
  notificationTypes: {
    lessonReminder: boolean;
    subscriptionExpiry: boolean;
  };
}

export interface LinkingCode {
  code: string;
  studentId: string;
  schoolId: string;
  expiresAt: Date;
  used: boolean;
}

class TelegramService {
  private readonly configCollection = 'telegram_settings';
  private readonly linkingCodesCollection = 'telegram_linking_codes';
  private readonly TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

  /**
   * Get Telegram configuration for a school
   */
  async getConfig(schoolId: string): Promise<TelegramConfig | null> {
    try {
      const docRef = doc(db, this.configCollection, schoolId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as TelegramConfig;
      }

      return null;
    } catch (error) {
      console.error('Error fetching Telegram config:', error);
      throw error;
    }
  }

  /**
   * Save Telegram configuration
   */
  async saveConfig(schoolId: string, config: TelegramConfig): Promise<void> {
    try {
      const docRef = doc(db, this.configCollection, schoolId);

      const configToSave = {
        ...config,
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, configToSave, { merge: true });
    } catch (error) {
      console.error('Error saving Telegram config:', error);
      throw error;
    }
  }

  /**
   * Verify bot token by fetching bot info from Telegram API
   */
  async verifyBotToken(botToken: string): Promise<{ valid: boolean; botInfo?: any; error?: string }> {
    try {
      const response = await fetch(`${this.TELEGRAM_API_BASE}${botToken}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return {
          valid: true,
          botInfo: data.result
        };
      } else {
        return {
          valid: false,
          error: data.description || 'Invalid bot token'
        };
      }
    } catch (error: any) {
      console.error('Error verifying bot token:', error);
      return {
        valid: false,
        error: error.message || 'Failed to verify bot token'
      };
    }
  }

  /**
   * Send a message via Telegram
   */
  async sendMessage(
    chatId: string,
    message: string,
    schoolId: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown';
      disable_web_page_preview?: boolean;
    }
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      const config = await this.getConfig(schoolId);

      if (!config || !config.isActive) {
        return {
          success: false,
          error: 'Telegram integration is not configured or not active'
        };
      }

      const url = `${this.TELEGRAM_API_BASE}${config.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: options?.parse_mode || 'HTML',
          disable_web_page_preview: options?.disable_web_page_preview ?? true
        })
      });

      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          messageId: data.result.message_id
        };
      } else {
        return {
          success: false,
          error: data.description || 'Failed to send message'
        };
      }
    } catch (error: any) {
      console.error('Error sending Telegram message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  /**
   * Send a test message
   */
  async sendTestMessage(
    schoolId: string,
    params: {
      chatId: string;
      message: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.sendMessage(params.chatId, params.message, schoolId);

      if (result.success) {
        // Log the test message
        await notificationLogsService.createLog({
          schoolId,
          recipientName: 'Test Recipient',
          recipientPhone: params.chatId,
          recipientType: 'student',
          notificationType: 'custom',
          channel: 'telegram' as any,
          status: 'sent',
          message: params.message,
          sentAt: new Date(),
          retryCount: 0
        });

        return { success: true, data: result };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error sending test message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send test message'
      };
    }
  }

  /**
   * Generate a unique linking code for a student
   */
  async generateLinkingCode(studentId: string, schoolId: string): Promise<string> {
    try {
      // Generate a random 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const linkingCode: LinkingCode = {
        code,
        studentId,
        schoolId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
        used: false
      };

      const docRef = doc(db, this.linkingCodesCollection, code);
      await setDoc(docRef, linkingCode);

      return code;
    } catch (error) {
      console.error('Error generating linking code:', error);
      throw error;
    }
  }

  /**
   * Verify and use a linking code
   */
  async verifyLinkingCode(code: string): Promise<LinkingCode | null> {
    try {
      const docRef = doc(db, this.linkingCodesCollection, code);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const linkingCode = docSnap.data() as LinkingCode;

      // Check if code is expired or already used
      if (linkingCode.used || new Date() > new Date(linkingCode.expiresAt)) {
        return null;
      }

      return linkingCode;
    } catch (error) {
      console.error('Error verifying linking code:', error);
      return null;
    }
  }

  /**
   * Link a student's Telegram account
   */
  async linkStudent(
    studentId: string,
    chatId: string,
    username?: string,
    language: 'en' | 'ru' = 'en'
  ): Promise<void> {
    try {
      // Use the database service to update the student
      const studentRef = doc(db, 'students', studentId);

      await updateDoc(studentRef, {
        'telegramNotifications.chatId': chatId,
        'telegramNotifications.username': username || null,
        'telegramNotifications.linkedAt': serverTimestamp(),
        'telegramNotifications.enabled': true,
        'telegramNotifications.language': language,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error linking student Telegram:', error);
      throw error;
    }
  }

  /**
   * Unlink a student's Telegram account
   */
  async unlinkStudent(studentId: string): Promise<void> {
    try {
      const studentRef = doc(db, 'students', studentId);

      await updateDoc(studentRef, {
        'telegramNotifications.chatId': null,
        'telegramNotifications.username': null,
        'telegramNotifications.linkedAt': null,
        'telegramNotifications.enabled': false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unlinking student Telegram:', error);
      throw error;
    }
  }

  /**
   * Mark linking code as used
   */
  async markCodeAsUsed(code: string): Promise<void> {
    try {
      const docRef = doc(db, this.linkingCodesCollection, code);
      await updateDoc(docRef, {
        used: true
      });
    } catch (error) {
      console.error('Error marking code as used:', error);
      throw error;
    }
  }

  /**
   * Get all students with Telegram enabled for a school
   */
  async getEnabledStudents(schoolId: string): Promise<FirebaseStudent[]> {
    try {
      const studentsRef = collection(db, 'students');
      const q = query(
        studentsRef,
        where('schoolId', '==', schoolId),
        where('telegramNotifications.enabled', '==', true)
      );

      const snapshot = await getDocs(q);
      const students: FirebaseStudent[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        students.push({
          id: doc.id,
          ...data
        } as FirebaseStudent);
      });

      return students;
    } catch (error) {
      console.error('Error getting enabled students:', error);
      return [];
    }
  }

  /**
   * Send notification to student with template parsing
   */
  async sendNotificationToStudent(
    student: FirebaseStudent,
    message: string,
    notificationType: string,
    schoolId: string
  ): Promise<void> {
    try {
      if (!student.telegramNotifications?.chatId || !student.telegramNotifications?.enabled) {
        console.log('Student does not have Telegram enabled');
        return;
      }

      const result = await this.sendMessage(
        student.telegramNotifications.chatId,
        message,
        schoolId
      );

      // Log notification
      await notificationLogsService.createLog({
        schoolId,
        recipientName: `${student.firstName} ${student.lastName}`,
        recipientPhone: student.telegramNotifications.chatId,
        recipientType: 'student',
        notificationType: notificationType as any,
        channel: 'telegram' as any,
        status: result.success ? 'sent' : 'failed',
        message,
        sentAt: new Date(),
        retryCount: 0,
        metadata: {
          studentId: student.id,
          telegramUsername: student.telegramNotifications.username
        },
        error: result.error
      });
    } catch (error) {
      console.error('Error sending notification to student:', error);
      throw error;
    }
  }

  /**
   * Parse template with variables
   */
  parseTemplate(template: string, variables: Record<string, string>): string {
    let message = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      message = message.replace(regex, value);
    }

    return message;
  }

  /**
   * Get bot info (for displaying in UI)
   */
  async getBotInfo(botToken: string): Promise<any> {
    try {
      const response = await fetch(`${this.TELEGRAM_API_BASE}${botToken}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return data.result;
      }

      return null;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  /**
   * Generate deep link for student linking
   */
  generateDeepLink(botUsername: string, code: string): string {
    return `https://t.me/${botUsername}?start=${code}`;
  }

  /**
   * Generate QR code data for student linking
   */
  generateQRCodeData(botUsername: string, code: string): string {
    return this.generateDeepLink(botUsername, code);
  }
}

export const telegramService = new TelegramService();
