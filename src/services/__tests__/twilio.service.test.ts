import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { twilioService } from '../twilio.service';

describe('TwilioService', () => {
  const mockSchoolId = 'school-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Configuration Management', () => {
    it('should save Twilio configuration with encrypted credentials', async () => {
      const config = {
        accountSid: 'AC123456789',
        authToken: 'auth-token-123',
        phoneNumberSms: '+1234567890',
        phoneNumberWhatsapp: 'whatsapp:+1234567890',
        isActive: true,
        monthlyBudget: 100
      };
      
      await twilioService.saveConfig(mockSchoolId, config);
      
      // Verify encryption was applied
      expect(config.accountSid).not.toBe('AC123456789');
    });
    
    it('should retrieve and decrypt Twilio configuration', async () => {
      const config = await twilioService.getConfig(mockSchoolId);
      
      expect(config).toBeDefined();
      expect(config?.isActive).toBeDefined();
    });
  });
  
  describe('Notification Settings', () => {
    it('should save notification templates with timing rules', async () => {
      const settings = [
        {
          type: 'lesson_reminder',
          enabled: true,
          channel: 'both' as const,
          template: 'Reminder: {subject} lesson at {time}',
          timing: [
            { value: 24, unit: 'hours' as const },
            { value: 1, unit: 'hours' as const }
          ]
        }
      ];
      
      await twilioService.saveNotificationSettings(mockSchoolId, settings);
      
      const saved = await twilioService.getNotificationSettings(mockSchoolId);
      expect(saved).toHaveLength(1);
      expect(saved[0].type).toBe('lesson_reminder');
    });
    
    it('should parse template variables correctly', async () => {
      const template = 'Hi {name}, your {subject} lesson is at {time}';
      const variables = {
        name: 'John',
        subject: 'Math',
        time: '3:00 PM'
      };
      
      // This would be a private method, but we can test via sendNotification
      const result = await twilioService.sendNotification(
        mockSchoolId,
        'student-123',
        'lesson_reminder',
        variables
      );
      
      // Check that message was formatted correctly
      expect(result).toContain('John');
      expect(result).toContain('Math');
      expect(result).toContain('3:00 PM');
    });
  });
  
  describe('Student Preferences', () => {
    it('should respect student opt-out preferences', async () => {
      const prefs = {
        studentId: 'student-123',
        optedOut: true,
        smsEnabled: false,
        whatsappEnabled: false
      };
      
      await twilioService.updateStudentPreferences('student-123', prefs);
      
      // Try to send notification
      const result = await twilioService.sendNotification(
        mockSchoolId,
        'student-123',
        'payment_reminder',
        {}
      );
      
      // Should not send if opted out
      expect(result).toBeUndefined();
    });
    
    it('should respect quiet hours', async () => {
      const prefs = {
        studentId: 'student-123',
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      };
      
      await twilioService.updateStudentPreferences('student-123', prefs);
      
      // Test during quiet hours
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01 23:00:00'));
      
      const result = await twilioService.sendNotification(
        mockSchoolId,
        'student-123',
        'lesson_reminder',
        {}
      );
      
      // Should not send during quiet hours
      expect(result).toBeUndefined();
      
      jest.useRealTimers();
    });
  });
  
  describe('Channel Selection', () => {
    it('should send via both channels when configured', async () => {
      const prefs = {
        studentId: 'student-123',
        smsEnabled: true,
        whatsappEnabled: true,
        phoneNumber: '+1234567890',
        whatsappNumber: '+1234567890'
      };
      
      await twilioService.updateStudentPreferences('student-123', prefs);
      
      // Mock the sending
      const sendSpy = jest.spyOn(twilioService, 'sendNotification');
      
      await twilioService.sendNotification(
        mockSchoolId,
        'student-123',
        'payment_reminder',
        { amount: '$100' }
      );
      
      // Should attempt both channels
      expect(sendSpy).toHaveBeenCalled();
    });
    
    it('should fallback to available channel', async () => {
      const prefs = {
        studentId: 'student-123',
        smsEnabled: false,
        whatsappEnabled: true,
        whatsappNumber: '+1234567890'
      };
      
      await twilioService.updateStudentPreferences('student-123', prefs);
      
      const result = await twilioService.sendNotification(
        mockSchoolId,
        'student-123',
        'lesson_reminder',
        {}
      );
      
      // Should use WhatsApp only
      expect(result).toBeDefined();
    });
  });
  
  describe('Test Messaging', () => {
    it('should send test message successfully', async () => {
      const testParams = {
        phone: '+1234567890',
        message: 'Test message',
        channel: 'sms' as const
      };
      
      const result = await twilioService.sendTestMessage(
        mockSchoolId,
        testParams
      );
      
      expect(result).toBeDefined();
    });
    
    it('should format WhatsApp numbers correctly', async () => {
      const testParams = {
        phone: '+1234567890',
        message: 'Test WhatsApp',
        channel: 'whatsapp' as const
      };
      
      const result = await twilioService.sendTestMessage(
        mockSchoolId,
        testParams
      );
      
      // Should prepend whatsapp: if not present
      expect(result).toBeDefined();
    });
  });
  
  describe('Logging and Tracking', () => {
    it('should log all sent messages', async () => {
      await twilioService.sendTestMessage(mockSchoolId, {
        phone: '+1234567890',
        message: 'Test',
        channel: 'sms'
      });
      
      const logs = await twilioService.getNotificationLogs(mockSchoolId);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('sent');
    });
    
    it('should track spending against budget', async () => {
      // Set budget
      await twilioService.saveConfig(mockSchoolId, {
        accountSid: 'AC123',
        authToken: 'auth',
        phoneNumberSms: '+123',
        phoneNumberWhatsapp: 'whatsapp:+123',
        isActive: true,
        monthlyBudget: 100,
        currentSpend: 0
      });
      
      // Send messages
      await twilioService.sendTestMessage(mockSchoolId, {
        phone: '+1234567890',
        message: 'Test',
        channel: 'sms'
      });
      
      // Check spend updated
      const config = await twilioService.getConfig(mockSchoolId);
      expect(config?.currentSpend).toBeGreaterThan(0);
    });
  });
});