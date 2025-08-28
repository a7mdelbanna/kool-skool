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
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  NotificationTemplate,
  NotificationRule,
  NotificationTemplateType,
  NotificationRuleType,
  DEFAULT_TEMPLATES,
  DEFAULT_NOTIFICATION_RULES,
  NOTIFICATION_VARIABLES,
  NotificationVariable
} from '@/types/notification.types';

class NotificationSettingsService {
  private readonly templatesCollection = 'notificationTemplates';
  private readonly rulesCollection = 'notificationRules';

  // ==================== TEMPLATES ====================

  /**
   * Get all notification templates for a school
   */
  async getTemplates(schoolId: string): Promise<NotificationTemplate[]> {
    try {
      const q = query(
        collection(db, this.templatesCollection),
        where('schoolId', '==', schoolId),
        orderBy('type'),
        orderBy('language'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as NotificationTemplate[];

      return templates;
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      return [];
    }
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(
    schoolId: string, 
    type: NotificationTemplateType
  ): Promise<NotificationTemplate[]> {
    try {
      const q = query(
        collection(db, this.templatesCollection),
        where('schoolId', '==', schoolId),
        where('type', '==', type),
        orderBy('language'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as NotificationTemplate[];
    } catch (error) {
      console.error('Error fetching templates by type:', error);
      return [];
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const docRef = doc(db, this.templatesCollection, templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as NotificationTemplate;
      }

      return null;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Create or update a notification template
   */
  async saveTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<string> {
    try {
      const templateData = {
        ...template,
        updatedAt: serverTimestamp(),
        createdAt: template.createdAt ? Timestamp.fromDate(template.createdAt) : serverTimestamp()
      };

      if (template.id) {
        // Update existing template
        const docRef = doc(db, this.templatesCollection, template.id);
        await updateDoc(docRef, templateData);
        return template.id;
      } else {
        // Create new template
        const docRef = await addDoc(collection(db, this.templatesCollection), templateData);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Delete a notification template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const docRef = doc(db, this.templatesCollection, templateId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Initialize default templates for a school
   */
  async initializeDefaultTemplates(schoolId: string): Promise<void> {
    try {
      // Check if templates already exist
      const existingTemplates = await this.getTemplates(schoolId);
      if (existingTemplates.length > 0) {
        console.log('Default templates already exist for school:', schoolId);
        return;
      }

      // Create batch to add all default templates
      const batch = writeBatch(db);
      
      DEFAULT_TEMPLATES.forEach(template => {
        const docRef = doc(collection(db, this.templatesCollection));
        batch.set(docRef, {
          ...template,
          schoolId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log('Default templates initialized for school:', schoolId);
    } catch (error) {
      console.error('Error initializing default templates:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATION RULES ====================

  /**
   * Get all notification rules for a school
   */
  async getNotificationRules(schoolId: string): Promise<NotificationRule[]> {
    try {
      const q = query(
        collection(db, this.rulesCollection),
        where('schoolId', '==', schoolId),
        orderBy('type')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as NotificationRule[];
    } catch (error) {
      console.error('Error fetching notification rules:', error);
      return [];
    }
  }

  /**
   * Get notification rule by type
   */
  async getNotificationRule(
    schoolId: string,
    type: NotificationRuleType
  ): Promise<NotificationRule | null> {
    try {
      const q = query(
        collection(db, this.rulesCollection),
        where('schoolId', '==', schoolId),
        where('type', '==', type)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as NotificationRule;
    } catch (error) {
      console.error('Error fetching notification rule:', error);
      return null;
    }
  }

  /**
   * Save notification rule
   */
  async saveNotificationRule(rule: Omit<NotificationRule, 'id'>): Promise<string> {
    try {
      const ruleData = {
        ...rule,
        updatedAt: serverTimestamp(),
        createdAt: rule.createdAt ? Timestamp.fromDate(rule.createdAt) : serverTimestamp()
      };

      if (rule.id) {
        // Update existing rule
        const docRef = doc(db, this.rulesCollection, rule.id);
        await updateDoc(docRef, ruleData);
        return rule.id;
      } else {
        // Create new rule - first check if rule for this type already exists
        const existingRule = await this.getNotificationRule(rule.schoolId!, rule.type);
        
        if (existingRule) {
          // Update existing rule
          const docRef = doc(db, this.rulesCollection, existingRule.id!);
          await updateDoc(docRef, ruleData);
          return existingRule.id!;
        } else {
          // Create new rule
          const docRef = await addDoc(collection(db, this.rulesCollection), ruleData);
          return docRef.id;
        }
      }
    } catch (error) {
      console.error('Error saving notification rule:', error);
      throw error;
    }
  }

  /**
   * Initialize default notification rules for a school
   */
  async initializeDefaultRules(schoolId: string): Promise<void> {
    try {
      // Check if rules already exist
      const existingRules = await this.getNotificationRules(schoolId);
      if (existingRules.length > 0) {
        console.log('Default rules already exist for school:', schoolId);
        return;
      }

      // Create batch to add all default rules
      const batch = writeBatch(db);

      DEFAULT_NOTIFICATION_RULES.forEach(rule => {
        const docRef = doc(collection(db, this.rulesCollection));
        batch.set(docRef, {
          ...rule,
          schoolId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log('Default notification rules initialized for school:', schoolId);
    } catch (error) {
      console.error('Error initializing default rules:', error);
      throw error;
    }
  }

  /**
   * Initialize both templates and rules for a school
   */
  async initializeDefaults(schoolId: string): Promise<void> {
    try {
      await Promise.all([
        this.initializeDefaultTemplates(schoolId),
        this.initializeDefaultRules(schoolId)
      ]);
    } catch (error) {
      console.error('Error initializing defaults:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get available variables for templates
   */
  getAvailableVariables(): NotificationVariable[] {
    return NOTIFICATION_VARIABLES;
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(template: NotificationTemplate): string {
    const sampleData: Record<string, string> = {
      studentName: 'John Doe',
      parentName: 'Jane Doe',
      teacherName: 'Mr. Smith',
      subject: 'Mathematics',
      lessonTime: 'Monday, Dec 25 at 2:00 PM',
      date: 'December 25, 2024',
      amount: '$150.00',
      lessonDuration: '60 minutes',
      location: 'Zoom Meeting Room',
      schoolName: 'TutorFlow Academy'
    };

    let preview = template.body;
    
    // Replace all variables with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  }

  /**
   * Validate template for required variables
   */
  validateTemplate(template: NotificationTemplate): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template body is not empty
    if (!template.body || template.body.trim().length === 0) {
      errors.push('Template body cannot be empty');
    }

    // Check if template name is not empty
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name cannot be empty');
    }

    // Find all variables used in template
    const variableRegex = /{(\w+)}/g;
    const usedVariables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(template.body)) !== null) {
      usedVariables.push(match[1]);
    }

    // Check if used variables are valid
    const validVariableKeys = NOTIFICATION_VARIABLES.map(v => v.key);
    const invalidVariables = usedVariables.filter(v => !validVariableKeys.includes(v));
    
    if (invalidVariables.length > 0) {
      warnings.push(`Unknown variables used: ${invalidVariables.join(', ')}`);
    }

    // Template-type specific validations
    switch (template.type) {
      case NotificationTemplateType.LESSON_REMINDER_1_DAY:
      case NotificationTemplateType.LESSON_REMINDER_2_HOURS:
      case NotificationTemplateType.LESSON_REMINDER_15_MIN:
        if (!usedVariables.includes('studentName')) {
          warnings.push('Consider including student name in lesson reminders');
        }
        if (!usedVariables.includes('lessonTime')) {
          warnings.push('Consider including lesson time in lesson reminders');
        }
        break;
      
      case NotificationTemplateType.PAYMENT_REMINDER:
        if (!usedVariables.includes('amount')) {
          warnings.push('Consider including payment amount in payment reminders');
        }
        if (!usedVariables.includes('parentName') && !usedVariables.includes('studentName')) {
          warnings.push('Consider including recipient name in payment reminders');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get template type display name
   */
  getTemplateTypeDisplayName(type: NotificationTemplateType): string {
    const displayNames: Record<NotificationTemplateType, string> = {
      [NotificationTemplateType.LESSON_REMINDER_1_DAY]: 'Lesson Reminder (1 Day)',
      [NotificationTemplateType.LESSON_REMINDER_2_HOURS]: 'Lesson Reminder (2 Hours)',
      [NotificationTemplateType.LESSON_REMINDER_15_MIN]: 'Lesson Reminder (15 Minutes)',
      [NotificationTemplateType.PAYMENT_REMINDER]: 'Payment Reminder',
      [NotificationTemplateType.LESSON_CANCELLATION]: 'Lesson Cancellation',
      [NotificationTemplateType.CUSTOM]: 'Custom Template'
    };

    return displayNames[type] || type;
  }
}

export const notificationSettingsService = new NotificationSettingsService();