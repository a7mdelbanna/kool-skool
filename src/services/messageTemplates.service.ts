import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface MessageTemplate {
  id?: string;
  schoolId: string;
  name: string;
  type: 'welcome' | 'lesson_reminder' | 'payment_reminder' | 'custom';
  subject?: string;
  content: string;
  language: 'en' | 'ru' | 'both';
  placeholders: string[]; // e.g., ['{studentName}', '{lessonTime}', '{amount}']
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TemplatePreview {
  content: string;
  placeholderValues: Record<string, string>;
}

class MessageTemplatesService {
  private readonly templatesCollection = 'message_templates';

  /**
   * Create a new message template
   */
  async createTemplate(
    template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.templatesCollection), {
        ...template,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.templatesCollection, templateId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete a template
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
   * Get all templates for a school
   */
  async getTemplates(schoolId: string): Promise<MessageTemplate[]> {
    try {
      const q = query(
        collection(db, this.templatesCollection),
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const templates: MessageTemplate[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as MessageTemplate);
      });

      return templates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<MessageTemplate | null> {
    try {
      const docRef = doc(db, this.templatesCollection, templateId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as MessageTemplate;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Get active template by type and language
   */
  async getActiveTemplate(
    schoolId: string,
    type: MessageTemplate['type'],
    language: 'en' | 'ru'
  ): Promise<MessageTemplate | null> {
    try {
      const q = query(
        collection(db, this.templatesCollection),
        where('schoolId', '==', schoolId),
        where('type', '==', type),
        where('isActive', '==', true),
        where('language', 'in', [language, 'both'])
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as MessageTemplate;
    } catch (error) {
      console.error('Error fetching active template:', error);
      return null;
    }
  }

  /**
   * Preview a template with placeholder values
   */
  previewTemplate(
    template: MessageTemplate,
    placeholderValues: Record<string, string>
  ): string {
    let preview = template.content;

    // Replace all placeholders with actual values
    Object.entries(placeholderValues).forEach(([key, value]) => {
      const placeholder = key.startsWith('{') ? key : `{${key}}`;
      preview = preview.replace(new RegExp(placeholder, 'g'), value);
    });

    return preview;
  }

  /**
   * Extract placeholders from template content
   */
  extractPlaceholders(content: string): string[] {
    const regex = /\{([^}]+)\}/g;
    const matches = content.match(regex);
    return matches || [];
  }

  /**
   * Toggle template active status
   */
  async toggleTemplateActive(
    templateId: string,
    isActive: boolean
  ): Promise<void> {
    try {
      await this.updateTemplate(templateId, { isActive });
    } catch (error) {
      console.error('Error toggling template status:', error);
      throw error;
    }
  }

  /**
   * Get default templates for initial setup
   */
  getDefaultTemplates(schoolId: string): Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        schoolId,
        name: 'Welcome Message (English)',
        type: 'welcome',
        content: `Welcome to {schoolName}, {studentName}! 🎓

We're excited to have you join us. I'm here to help you stay updated with your lessons and payments.

You can use these commands anytime:
/schedule - View your upcoming lessons
/subscriptions - Check your active courses
/balance - See your payment status
/help - Get help

Let's make learning great together!`,
        language: 'en',
        placeholders: ['{schoolName}', '{studentName}'],
        isActive: true
      },
      {
        schoolId,
        name: 'Welcome Message (Russian)',
        type: 'welcome',
        content: `Добро пожаловать в {schoolName}, {studentName}! 🎓

Мы рады, что вы присоединились к нам. Я здесь, чтобы помочь вам быть в курсе ваших уроков и платежей.

Вы можете использовать эти команды в любое время:
/schedule - Просмотр предстоящих уроков
/subscriptions - Проверка активных курсов
/balance - Просмотр статуса платежей
/help - Получить помощь

Давайте вместе сделаем обучение отличным!`,
        language: 'ru',
        placeholders: ['{schoolName}', '{studentName}'],
        isActive: true
      },
      {
        schoolId,
        name: 'Lesson Reminder (English)',
        type: 'lesson_reminder',
        content: `Hi {studentName}! 📚

Reminder: You have a {courseName} lesson coming up.

📅 Date: {lessonDate}
⏰ Time: {lessonTime}
👨‍🏫 Teacher: {teacherName}

See you there!`,
        language: 'en',
        placeholders: ['{studentName}', '{courseName}', '{lessonDate}', '{lessonTime}', '{teacherName}'],
        isActive: true
      },
      {
        schoolId,
        name: 'Lesson Reminder (Russian)',
        type: 'lesson_reminder',
        content: `Привет, {studentName}! 📚

Напоминание: У вас предстоящий урок {courseName}.

📅 Дата: {lessonDate}
⏰ Время: {lessonTime}
👨‍🏫 Преподаватель: {teacherName}

До встречи!`,
        language: 'ru',
        placeholders: ['{studentName}', '{courseName}', '{lessonDate}', '{lessonTime}', '{teacherName}'],
        isActive: true
      },
      {
        schoolId,
        name: 'Payment Reminder (English)',
        type: 'payment_reminder',
        content: `Hello {studentName}! 💳

This is a friendly reminder about your upcoming payment.

💰 Amount: {amount}
📅 Due Date: {dueDate}
📝 Description: {description}

Please make sure to complete the payment by the due date.

Thank you!`,
        language: 'en',
        placeholders: ['{studentName}', '{amount}', '{dueDate}', '{description}'],
        isActive: true
      },
      {
        schoolId,
        name: 'Payment Reminder (Russian)',
        type: 'payment_reminder',
        content: `Здравствуйте, {studentName}! 💳

Это дружеское напоминание о предстоящем платеже.

💰 Сумма: {amount}
📅 Срок оплаты: {dueDate}
📝 Описание: {description}

Пожалуйста, убедитесь, что оплата произведена до указанной даты.

Спасибо!`,
        language: 'ru',
        placeholders: ['{studentName}', '{amount}', '{dueDate}', '{description}'],
        isActive: true
      }
    ];
  }

  /**
   * Initialize default templates for a school
   */
  async initializeDefaultTemplates(schoolId: string): Promise<void> {
    try {
      const existingTemplates = await this.getTemplates(schoolId);

      if (existingTemplates.length === 0) {
        const defaultTemplates = this.getDefaultTemplates(schoolId);

        for (const template of defaultTemplates) {
          await this.createTemplate(template);
        }
      }
    } catch (error) {
      console.error('Error initializing default templates:', error);
      throw error;
    }
  }
}

export const messageTemplatesService = new MessageTemplatesService();
