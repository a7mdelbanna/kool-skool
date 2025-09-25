import { studentDictionaryService } from '../firebase/studentDictionary.service';

// Configuration type
interface OpenAIConfig {
  apiKey: string;
  organization?: string;
}

// Message types for conversation
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  audio_url?: string;
  transcript?: string;
}

// Transcription result
export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
  confidence?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

// Pronunciation assessment
export interface PronunciationAssessment {
  overall_score: number; // 0-100
  fluency_score: number;
  accuracy_score: number;
  completeness_score: number;
  word_scores?: Array<{
    word: string;
    score: number;
    pronunciation_issues?: string[];
  }>;
}

// Grammar check result
export interface GrammarCheckResult {
  has_errors: boolean;
  errors: Array<{
    text: string;
    correction: string;
    explanation: string;
    type: 'grammar' | 'spelling' | 'punctuation' | 'style';
    severity: 'error' | 'warning' | 'suggestion';
  }>;
  corrected_text: string;
  score: number; // 0-100
}

// Vocabulary extraction result
export interface ExtractedVocabulary {
  words: Array<{
    english: string;
    context_sentence: string;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    part_of_speech?: string;
    definition?: string;
    is_new?: boolean; // Whether it's likely new for the student's level
  }>;
  idioms?: Array<{
    expression: string;
    meaning: string;
    usage_example: string;
  }>;
  phrasal_verbs?: Array<{
    verb: string;
    meaning: string;
    example: string;
  }>;
}

// Feedback generation result
export interface GeneratedFeedback {
  overall_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  specific_corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  vocabulary_suggestions: string[];
  next_steps: string[];
}

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private organization?: string;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.organization = import.meta.env.VITE_OPENAI_ORG_ID;
  }

  // Initialize with API key
  initialize(config?: OpenAIConfig) {
    if (config?.apiKey) {
      this.apiKey = config.apiKey;
    }
    if (config?.organization) {
      this.organization = config.organization;
    }
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Transcribe audio using Whisper
  async transcribeAudio(
    audioBlob: Blob,
    options?: {
      language?: string; // ISO language code (e.g., 'en', 'ru')
      prompt?: string; // Context to improve accuracy
      temperature?: number;
    }
  ): Promise<TranscriptionResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      if (options?.language) {
        formData.append('language', options.language);
      }

      if (options?.prompt) {
        formData.append('prompt', options.prompt);
      }

      if (options?.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }

      formData.append('response_format', 'verbose_json'); // Get detailed output

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.organization && { 'OpenAI-Organization': this.organization })
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }

      const data = await response.json();

      return {
        text: data.text,
        duration: data.duration,
        language: data.language,
        words: data.words
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  // Generate conversational response using GPT-4
  async generateResponse(
    messages: ConversationMessage[],
    options?: {
      model?: 'gpt-4' | 'gpt-3.5-turbo';
      temperature?: number;
      max_tokens?: number;
      student_level?: string;
      conversation_style?: 'formal' | 'casual' | 'encouraging' | 'challenging';
      vocabulary_focus?: string[];
      correction_mode?: 'immediate' | 'subtle' | 'none';
    }
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Build system prompt based on options
      const systemPrompt = this.buildSystemPrompt(options);

      // Prepare messages with system prompt
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.organization && { 'OpenAI-Organization': this.organization })
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-4',
          messages: apiMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 500,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Response generation failed');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Response generation error:', error);
      throw error;
    }
  }

  // Assess pronunciation (requires audio analysis)
  async assessPronunciation(
    audioBlob: Blob,
    expectedText: string,
    language: string = 'en'
  ): Promise<PronunciationAssessment> {
    // First transcribe the audio
    const transcription = await this.transcribeAudio(audioBlob, { language });

    // Compare with expected text using GPT-4
    const prompt = `
      Assess the pronunciation quality by comparing:
      Expected: "${expectedText}"
      Spoken: "${transcription.text}"

      Provide assessment in JSON format:
      {
        "overall_score": 0-100,
        "fluency_score": 0-100,
        "accuracy_score": 0-100,
        "completeness_score": 0-100,
        "word_scores": [
          {
            "word": "word",
            "score": 0-100,
            "pronunciation_issues": ["issue1", "issue2"]
          }
        ]
      }
    `;

    const response = await this.generateResponse([
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4',
      temperature: 0.3,
      max_tokens: 500
    });

    try {
      const assessment = JSON.parse(response);
      return assessment;
    } catch {
      // Fallback assessment based on similarity
      const similarity = this.calculateTextSimilarity(expectedText, transcription.text);
      return {
        overall_score: similarity * 100,
        fluency_score: similarity * 100,
        accuracy_score: similarity * 100,
        completeness_score: similarity * 100
      };
    }
  }

  // Check grammar and provide corrections
  async checkGrammar(text: string, level?: string): Promise<GrammarCheckResult> {
    const prompt = `
      Check the grammar of the following text and provide corrections.
      Student level: ${level || 'intermediate'}
      Text: "${text}"

      Provide response in JSON format:
      {
        "has_errors": boolean,
        "errors": [
          {
            "text": "original text",
            "correction": "corrected text",
            "explanation": "why it's wrong",
            "type": "grammar|spelling|punctuation|style",
            "severity": "error|warning|suggestion"
          }
        ],
        "corrected_text": "fully corrected text",
        "score": 0-100
      }
    `;

    const response = await this.generateResponse([
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4',
      temperature: 0.3,
      max_tokens: 500
    });

    try {
      const result = JSON.parse(response);
      return result;
    } catch {
      // Fallback response
      return {
        has_errors: false,
        errors: [],
        corrected_text: text,
        score: 100
      };
    }
  }

  // Extract vocabulary from conversation
  async extractVocabulary(
    text: string,
    studentLevel: string = 'intermediate'
  ): Promise<ExtractedVocabulary> {
    const prompt = `
      Extract vocabulary from the following text that would be useful for a ${studentLevel} English learner:
      "${text}"

      Provide response in JSON format:
      {
        "words": [
          {
            "english": "word",
            "context_sentence": "sentence where it appeared",
            "difficulty_level": "beginner|intermediate|advanced",
            "part_of_speech": "noun|verb|adjective|etc",
            "definition": "simple definition",
            "is_new": true/false
          }
        ],
        "idioms": [
          {
            "expression": "idiom",
            "meaning": "what it means",
            "usage_example": "example sentence"
          }
        ],
        "phrasal_verbs": [
          {
            "verb": "phrasal verb",
            "meaning": "what it means",
            "example": "example sentence"
          }
        ]
      }
    `;

    const response = await this.generateResponse([
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4',
      temperature: 0.3,
      max_tokens: 1000
    });

    try {
      const vocabulary = JSON.parse(response);
      return vocabulary;
    } catch {
      // Fallback: extract basic words
      const words = text.split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 10)
        .map(word => ({
          english: word.toLowerCase(),
          context_sentence: text,
          difficulty_level: 'intermediate' as const,
          is_new: true
        }));

      return { words };
    }
  }

  // Generate detailed feedback for student
  async generateFeedback(
    studentResponse: string,
    context: {
      topic?: string;
      expectedLevel?: string;
      focusAreas?: string[];
    }
  ): Promise<GeneratedFeedback> {
    const prompt = `
      Provide detailed feedback for this student response:
      Topic: ${context.topic || 'General conversation'}
      Expected Level: ${context.expectedLevel || 'intermediate'}
      Focus Areas: ${context.focusAreas?.join(', ') || 'general'}

      Student Response: "${studentResponse}"

      Provide feedback in JSON format:
      {
        "overall_feedback": "general assessment",
        "strengths": ["strength1", "strength2"],
        "areas_for_improvement": ["area1", "area2"],
        "specific_corrections": [
          {
            "original": "original phrase",
            "corrected": "corrected phrase",
            "explanation": "why"
          }
        ],
        "vocabulary_suggestions": ["word1", "word2"],
        "next_steps": ["suggestion1", "suggestion2"]
      }
    `;

    const response = await this.generateResponse([
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4',
      temperature: 0.5,
      max_tokens: 1000
    });

    try {
      const feedback = JSON.parse(response);
      return feedback;
    } catch {
      // Fallback feedback
      return {
        overall_feedback: 'Good effort! Keep practicing.',
        strengths: ['Attempted the task'],
        areas_for_improvement: ['Practice more'],
        specific_corrections: [],
        vocabulary_suggestions: [],
        next_steps: ['Continue with the next lesson']
      };
    }
  }

  // Build system prompt based on options
  private buildSystemPrompt(options?: any): string {
    const level = options?.student_level || 'intermediate';
    const style = options?.conversation_style || 'encouraging';
    const correction = options?.correction_mode || 'subtle';

    let prompt = `You are an English language tutor having a conversation with a ${level} level student. `;

    // Add style instructions
    switch (style) {
      case 'formal':
        prompt += 'Maintain a professional and formal tone. ';
        break;
      case 'casual':
        prompt += 'Be friendly and casual, like talking to a friend. ';
        break;
      case 'encouraging':
        prompt += 'Be very encouraging and supportive, celebrate small wins. ';
        break;
      case 'challenging':
        prompt += 'Challenge the student with more complex language and ideas. ';
        break;
    }

    // Add correction instructions
    switch (correction) {
      case 'immediate':
        prompt += 'Correct errors immediately and explain them. ';
        break;
      case 'subtle':
        prompt += 'Model correct usage without explicitly pointing out errors. ';
        break;
      case 'none':
        prompt += 'Focus on communication, do not correct errors. ';
        break;
    }

    // Add vocabulary focus
    if (options?.vocabulary_focus?.length) {
      prompt += `Try to naturally incorporate these words: ${options.vocabulary_focus.join(', ')}. `;
    }

    // General instructions
    prompt += `
      Keep responses concise and appropriate for the student's level.
      Ask follow-up questions to encourage speaking.
      Use simple language for beginners, more complex for advanced.
      Be patient and encouraging.
      End responses with a question or prompt to continue the conversation.
    `;

    return prompt;
  }

  // Calculate text similarity (simple implementation)
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  // Process and add vocabulary to student dictionary
  async addVocabularyToDictionary(
    studentId: string,
    vocabulary: ExtractedVocabulary,
    sourceType: 'speaking',
    sourceId: string
  ): Promise<void> {
    const words = vocabulary.words.map(word => ({
      english: word.english,
      translation: '', // Will need translation service
      language: 'en',
      additionalData: {
        source_context: word.context_sentence,
        part_of_speech: word.part_of_speech as any,
        definition: word.definition,
        difficulty_level: word.difficulty_level
      }
    }));

    await studentDictionaryService.addWords(
      studentId,
      words,
      {
        type: sourceType,
        id: sourceId,
        added_by: 'ai'
      }
    );
  }

  // Estimate token usage and cost
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  estimateCost(tokens: number, model: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4'): number {
    // Approximate costs per 1K tokens (as of 2024)
    const costs = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    };

    // Assume 50/50 input/output ratio
    const avgCost = (costs[model].input + costs[model].output) / 2;
    return (tokens / 1000) * avgCost;
  }
}

export const openAIService = new OpenAIService();