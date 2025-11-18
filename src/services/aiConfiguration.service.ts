/**
 * AI Configuration Service
 * Manages per-school AI assistant settings
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface AIPersonality {
  friendlinessLevel: 'formal' | 'friendly' | 'very_friendly';
  useHumor: boolean;
  tone: string;
}

export interface AIConfiguration {
  enabled: boolean;
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o-mini';
  maxTokens: number;
  customContext?: string;
  personality: AIPersonality;
  customInstructions?: string;
}

class AIConfigurationService {
  /**
   * Get AI configuration for a school
   */
  async getConfiguration(schoolId: string): Promise<AIConfiguration | null> {
    try {
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolDoc = await getDoc(schoolRef);

      if (!schoolDoc.exists()) {
        console.warn('School not found:', schoolId);
        return null;
      }

      const schoolData = schoolDoc.data();
      const aiConfig = schoolData.aiConfiguration;

      if (!aiConfig) {
        // Return default configuration
        return this.getDefaultConfiguration();
      }

      return {
        enabled: aiConfig.enabled || false,
        apiKey: aiConfig.apiKey || '',
        model: aiConfig.model || 'gpt-3.5-turbo',
        maxTokens: aiConfig.maxTokens || 150,
        customContext: aiConfig.customContext || '',
        personality: {
          friendlinessLevel: aiConfig.personality?.friendlinessLevel || 'friendly',
          useHumor: aiConfig.personality?.useHumor || false,
          tone: aiConfig.personality?.tone || 'professional'
        },
        customInstructions: aiConfig.customInstructions || ''
      };
    } catch (error) {
      console.error('Error fetching AI configuration:', error);
      throw error;
    }
  }

  /**
   * Update AI configuration for a school
   */
  async updateConfiguration(
    schoolId: string,
    config: AIConfiguration
  ): Promise<void> {
    try {
      const schoolRef = doc(db, 'schools', schoolId);

      await updateDoc(schoolRef, {
        aiConfiguration: {
          enabled: config.enabled,
          apiKey: config.apiKey,
          model: config.model,
          maxTokens: config.maxTokens,
          customContext: config.customContext || '',
          personality: {
            friendlinessLevel: config.personality.friendlinessLevel,
            useHumor: config.personality.useHumor,
            tone: config.personality.tone
          },
          customInstructions: config.customInstructions || '',
          updatedAt: new Date()
        }
      });

      console.log('AI configuration updated successfully');
    } catch (error) {
      console.error('Error updating AI configuration:', error);
      throw error;
    }
  }

  /**
   * Test AI configuration (validate API key)
   */
  async testConfiguration(apiKey: string, model: string): Promise<{ success: boolean; error?: string }> {
    try {
      // We can't directly test OpenAI from the frontend due to CORS
      // This would need to be done via a Cloud Function
      // For now, just validate the API key format
      if (!apiKey || !apiKey.startsWith('sk-')) {
        return {
          success: false,
          error: 'Invalid API key format. OpenAI API keys start with "sk-"'
        };
      }

      if (!model) {
        return {
          success: false,
          error: 'Please select a model'
        };
      }

      // TODO: Implement actual API test via Cloud Function
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to test configuration'
      };
    }
  }

  /**
   * Get default AI configuration
   */
  getDefaultConfiguration(): AIConfiguration {
    return {
      enabled: false,
      apiKey: '',
      model: 'gpt-3.5-turbo',
      maxTokens: 150,
      customContext: '',
      personality: {
        friendlinessLevel: 'friendly',
        useHumor: false,
        tone: 'professional'
      },
      customInstructions: ''
    };
  }

  /**
   * Get available AI models with descriptions
   */
  getAvailableModels() {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective (~$0.002/1K tokens)',
        recommended: true
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Better quality, affordable (~$0.015/1K tokens)',
        recommended: false
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Advanced capabilities (~$0.01/1K tokens)',
        recommended: false
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Best quality (~$0.03/1K tokens)',
        recommended: false
      }
    ];
  }
}

export const aiConfigurationService = new AIConfigurationService();
