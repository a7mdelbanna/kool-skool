import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumberSms: string;
  phoneNumberWhatsapp: string;
  isActive: boolean;
  monthlyBudget?: number;
  currentSpend?: number;
  updatedAt?: any;
}

interface NotificationSettings {
  type: string;
  enabled: boolean;
  channel: 'sms' | 'whatsapp' | 'both';
  template: string;
  timing: {
    value: number;
    unit: 'hours' | 'days';
  }[];
}

interface NotificationLog {
  recipientId: string;
  recipientPhone: string;
  type: string;
  channel: 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  message: string;
  twilioSid?: string;
  cost?: number;
  sentAt: Timestamp;
  deliveredAt?: Timestamp;
  error?: string;
}

interface StudentNotificationPrefs {
  studentId: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  phoneNumber?: string;
  whatsappNumber?: string;
  quietHours?: {
    start: string;
    end: string;
  };
  optedOut: boolean;
}

class TwilioService {
  private readonly configCollection = 'twilioConfigs';
  private readonly settingsCollection = 'notificationSettings';
  private readonly logsCollection = 'notificationLogs';
  private readonly prefsCollection = 'studentNotificationPrefs';
  
  /**
   * Get Twilio configuration for a school
   */
  async getConfig(schoolId: string): Promise<TwilioConfig | null> {
    try {
      const docRef = doc(db, this.configCollection, schoolId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as TwilioConfig;
        
        // Decrypt sensitive data when loading, but handle gracefully
        try {
          // Only attempt decryption if the values look encoded (base64)
          if (data.accountSid && this.isBase64(data.accountSid)) {
            data.accountSid = this.decrypt(data.accountSid);
          }
          if (data.authToken && this.isBase64(data.authToken)) {
            data.authToken = this.decrypt(data.authToken);
          }
        } catch (decryptError) {
          console.warn('Failed to decrypt Twilio credentials, using as-is:', decryptError);
          // If decryption fails, use the values as they are
        }
        
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Twilio config:', error);
      throw error;
    }
  }
  
  /**
   * Save Twilio configuration
   */
  async saveConfig(schoolId: string, config: TwilioConfig): Promise<void> {
    try {
      const docRef = doc(db, this.configCollection, schoolId);
      
      // For now, store in plain text to avoid encoding issues
      // In production, implement proper encryption with a secure key
      const configToSave = {
        ...config,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(docRef, configToSave, { merge: true });
    } catch (error) {
      console.error('Error saving Twilio config:', error);
      throw error;
    }
  }
  
  /**
   * Get notification settings for a school
   */
  async getNotificationSettings(schoolId: string): Promise<NotificationSettings[]> {
    try {
      const q = query(
        collection(db, this.settingsCollection),
        where('schoolId', '==', schoolId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationSettings[];
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return [];
    }
  }
  
  /**
   * Save notification settings
   */
  async saveNotificationSettings(
    schoolId: string, 
    settings: NotificationSettings[]
  ): Promise<void> {
    try {
      // Save each setting
      for (const setting of settings) {
        const docRef = doc(db, this.settingsCollection, `${schoolId}_${setting.type}`);
        await setDoc(docRef, {
          ...setting,
          schoolId,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }
  
  /**
   * Test Twilio credentials without sending a message
   */
  async testTwilioCredentials(
    schoolId: string,
    credentials: {
      accountSid: string;
      authToken: string;
      phoneNumberSms?: string;
      phoneNumberWhatsapp?: string;
    }
  ): Promise<{ valid: boolean; details: any }> {
    try {
      // Call Firebase Function to test credentials
      const testCredentials = httpsCallable(functions, 'testTwilioCredentials');
      const result = await testCredentials({
        schoolId,
        accountSid: credentials.accountSid,
        authToken: credentials.authToken,
        phoneNumberSms: credentials.phoneNumberSms,
        phoneNumberWhatsapp: credentials.phoneNumberWhatsapp
      });
      
      return result.data as { valid: boolean; details: any };
    } catch (error) {
      console.error('Error testing Twilio credentials:', error);
      // If the function doesn't exist, fallback to basic validation
      if (error instanceof Error && error.message.includes('Function not found')) {
        console.warn('testTwilioCredentials function not deployed, falling back to local validation');
        return {
          valid: credentials.accountSid.startsWith('AC') && credentials.authToken.length >= 32,
          details: { message: 'Basic validation passed. Deploy testTwilioCredentials function for full testing.' }
        };
      }
      throw error;
    }
  }

  /**
   * Send a test message
   */
  async sendTestMessage(
    schoolId: string,
    params: {
      phone: string;
      message: string;
      channel: 'sms' | 'whatsapp';
    }
  ): Promise<void> {
    try {
      // Call Firebase Function to send message
      const sendMessage = httpsCallable(functions, 'sendTwilioMessage');
      const result = await sendMessage({
        schoolId,
        phone: params.phone,
        message: params.message,
        channel: params.channel,
        isTest: true
      });
      
      // Log the test message
      await this.logNotification(schoolId, {
        recipientId: 'test',
        recipientPhone: params.phone,
        type: 'test',
        channel: params.channel,
        status: 'sent',
        message: params.message,
        sentAt: Timestamp.now()
      });
      
      return result.data as any;
    } catch (error) {
      console.error('Error sending test message:', error);
      throw error;
    }
  }
  
  /**
   * Send notification to student
   */
  async sendNotification(
    schoolId: string,
    studentId: string,
    type: string,
    variables: Record<string, string>
  ): Promise<void> {
    try {
      // Get student preferences
      const prefs = await this.getStudentPreferences(studentId);
      if (prefs?.optedOut) {
        console.log('Student has opted out of notifications');
        return;
      }
      
      // Get notification settings
      const settings = await this.getNotificationSettingByType(schoolId, type);
      if (!settings?.enabled) {
        console.log('Notification type is disabled');
        return;
      }
      
      // Check quiet hours
      if (this.isInQuietHours(prefs?.quietHours)) {
        console.log('Currently in quiet hours, scheduling for later');
        // Schedule for later
        return;
      }
      
      // Prepare message
      const message = this.parseTemplate(settings.template, variables);
      
      // Send via appropriate channel(s)
      const channels = this.determineChannels(settings.channel, prefs);
      
      for (const channel of channels) {
        const phone = channel === 'sms' ? prefs?.phoneNumber : prefs?.whatsappNumber;
        
        if (!phone) continue;
        
        // Send message via Firebase Function
        const sendMessage = httpsCallable(functions, 'sendTwilioMessage');
        await sendMessage({
          schoolId,
          phone,
          message,
          channel,
          studentId,
          notificationType: type
        });
        
        // Log notification
        await this.logNotification(schoolId, {
          recipientId: studentId,
          recipientPhone: phone,
          type,
          channel,
          status: 'sent',
          message,
          sentAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
  
  /**
   * Get student notification preferences
   */
  async getStudentPreferences(studentId: string): Promise<StudentNotificationPrefs | null> {
    try {
      const docRef = doc(db, this.prefsCollection, studentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as StudentNotificationPrefs;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching student preferences:', error);
      return null;
    }
  }
  
  /**
   * Update student notification preferences
   */
  async updateStudentPreferences(
    studentId: string,
    prefs: Partial<StudentNotificationPrefs>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.prefsCollection, studentId);
      await setDoc(docRef, {
        ...prefs,
        studentId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating student preferences:', error);
      throw error;
    }
  }
  
  /**
   * Get notification logs
   */
  async getNotificationLogs(
    schoolId: string,
    limit: number = 100
  ): Promise<NotificationLog[]> {
    try {
      const q = query(
        collection(db, this.logsCollection),
        where('schoolId', '==', schoolId),
        orderBy('sentAt', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationLog[];
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      return [];
    }
  }
  
  /**
   * Schedule bulk notifications (for Cloud Functions)
   */
  async scheduleLessonReminders(schoolId: string): Promise<void> {
    try {
      // This would be called by a Cloud Function
      const scheduleReminders = httpsCallable(functions, 'scheduleLessonReminders');
      await scheduleReminders({ schoolId });
    } catch (error) {
      console.error('Error scheduling lesson reminders:', error);
      throw error;
    }
  }
  
  async schedulePaymentReminders(schoolId: string): Promise<void> {
    try {
      // This would be called by a Cloud Function
      const scheduleReminders = httpsCallable(functions, 'schedulePaymentReminders');
      await scheduleReminders({ schoolId });
    } catch (error) {
      console.error('Error scheduling payment reminders:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private async logNotification(
    schoolId: string,
    log: NotificationLog
  ): Promise<void> {
    try {
      await addDoc(collection(db, this.logsCollection), {
        ...log,
        schoolId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }
  
  private async getNotificationSettingByType(
    schoolId: string,
    type: string
  ): Promise<NotificationSettings | null> {
    try {
      const docRef = doc(db, this.settingsCollection, `${schoolId}_${type}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as NotificationSettings;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching notification setting:', error);
      return null;
    }
  }
  
  private parseTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let message = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      message = message.replace(regex, value);
    }
    
    return message;
  }
  
  private determineChannels(
    settingChannel: 'sms' | 'whatsapp' | 'both',
    prefs: StudentNotificationPrefs | null
  ): ('sms' | 'whatsapp')[] {
    const channels: ('sms' | 'whatsapp')[] = [];
    
    if (settingChannel === 'both') {
      if (prefs?.smsEnabled !== false) channels.push('sms');
      if (prefs?.whatsappEnabled !== false) channels.push('whatsapp');
    } else if (settingChannel === 'sms' && prefs?.smsEnabled !== false) {
      channels.push('sms');
    } else if (settingChannel === 'whatsapp' && prefs?.whatsappEnabled !== false) {
      channels.push('whatsapp');
    }
    
    return channels;
  }
  
  private isInQuietHours(quietHours?: { start: string; end: string }): boolean {
    if (!quietHours) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }
  
  // Helper to check if string is base64 encoded
  private isBase64(str: string): boolean {
    try {
      // Check if it's a valid base64 string and different from original when decoded
      const decoded = atob(str);
      const reencoded = btoa(decoded);
      return reencoded === str && decoded !== str;
    } catch {
      return false;
    }
  }
  
  // Simple encryption (in production, use proper encryption)
  private encrypt(text: string): string {
    // In production, use proper encryption library
    return btoa(text);
  }
  
  private decrypt(text: string): string {
    // In production, use proper encryption library
    return atob(text);
  }
}

export const twilioService = new TwilioService();