/**
 * Translation Service
 * 
 * This service provides translation functionality using Google Translate API
 * For production, you'll need to:
 * 1. Enable Google Cloud Translation API in your Google Cloud Console
 * 2. Create an API key
 * 3. Add the API key to your environment variables
 */

interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

interface TranslationError {
  error: boolean;
  message: string;
}

class TranslationService {
  private apiKey: string;
  private baseUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor() {
    // In production, use: import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY
    this.apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || '';
  }

  /**
   * Translate text from one language to another
   * @param text - The text to translate
   * @param targetLanguage - Target language code (e.g., 'ru' for Russian)
   * @param sourceLanguage - Source language code (optional, will auto-detect if not provided)
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult | TranslationError> {
    try {
      // For demo purposes, we'll use a mock translation
      // In production, uncomment the actual API call below
      return this.mockTranslate(text, targetLanguage);

      /* // Actual Google Translate API call
      if (!this.apiKey) {
        throw new Error('Google Translate API key not configured');
      }

      const params = new URLSearchParams({
        key: this.apiKey,
        q: text,
        target: targetLanguage,
        ...(sourceLanguage && { source: sourceLanguage })
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        translatedText: data.data.translations[0].translatedText,
        detectedSourceLanguage: data.data.translations[0].detectedSourceLanguage
      };
      */
    } catch (error) {
      console.error('Translation error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Translation failed'
      };
    }
  }

  /**
   * Translate multiple texts at once
   * @param texts - Array of texts to translate
   * @param targetLanguage - Target language code
   * @param sourceLanguage - Source language code (optional)
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<(TranslationResult | TranslationError)[]> {
    try {
      // For demo, translate each text individually
      const promises = texts.map(text => 
        this.translate(text, targetLanguage, sourceLanguage)
      );
      
      return Promise.all(promises);
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts.map(() => ({
        error: true,
        message: 'Translation failed'
      }));
    }
  }

  /**
   * Mock translation for demo purposes
   * Provides simple translations for common words
   */
  private mockTranslate(text: string, targetLanguage: string): TranslationResult {
    // Simple mock translations (English to Russian)
    const mockTranslations: Record<string, Record<string, string>> = {
      'ru': {
        // Common words
        'hello': 'привет',
        'goodbye': 'до свидания',
        'thank you': 'спасибо',
        'please': 'пожалуйста',
        'yes': 'да',
        'no': 'нет',
        'good': 'хорошо',
        'bad': 'плохо',
        'book': 'книга',
        'pen': 'ручка',
        'pencil': 'карандаш',
        'paper': 'бумага',
        'computer': 'компьютер',
        'phone': 'телефон',
        'table': 'стол',
        'chair': 'стул',
        'window': 'окно',
        'door': 'дверь',
        'house': 'дом',
        'school': 'школа',
        'teacher': 'учитель',
        'student': 'студент',
        'lesson': 'урок',
        'homework': 'домашнее задание',
        'test': 'тест',
        'exam': 'экзамен',
        'question': 'вопрос',
        'answer': 'ответ',
        'read': 'читать',
        'write': 'писать',
        'speak': 'говорить',
        'listen': 'слушать',
        'understand': 'понимать',
        'learn': 'учить',
        'study': 'изучать',
        'practice': 'практиковать',
        'repeat': 'повторять',
        'remember': 'помнить',
        'forget': 'забывать',
        'know': 'знать',
        'think': 'думать',
        'believe': 'верить',
        'want': 'хотеть',
        'need': 'нуждаться',
        'like': 'нравиться',
        'love': 'любить',
        'hate': 'ненавидеть',
        // Days of the week
        'monday': 'понедельник',
        'tuesday': 'вторник',
        'wednesday': 'среда',
        'thursday': 'четверг',
        'friday': 'пятница',
        'saturday': 'суббота',
        'sunday': 'воскресенье',
        // Numbers
        'one': 'один',
        'two': 'два',
        'three': 'три',
        'four': 'четыре',
        'five': 'пять',
        'six': 'шесть',
        'seven': 'семь',
        'eight': 'восемь',
        'nine': 'девять',
        'ten': 'десять',
        // Colors
        'red': 'красный',
        'blue': 'синий',
        'green': 'зеленый',
        'yellow': 'желтый',
        'black': 'черный',
        'white': 'белый',
        'orange': 'оранжевый',
        'purple': 'фиолетовый',
        'pink': 'розовый',
        'brown': 'коричневый',
        'gray': 'серый',
        'grey': 'серый'
      },
      'es': {
        // Spanish translations
        'hello': 'hola',
        'goodbye': 'adiós',
        'thank you': 'gracias',
        'please': 'por favor',
        'yes': 'sí',
        'no': 'no',
        'book': 'libro',
        'teacher': 'profesor',
        'student': 'estudiante'
      },
      'fr': {
        // French translations
        'hello': 'bonjour',
        'goodbye': 'au revoir',
        'thank you': 'merci',
        'please': 's\'il vous plaît',
        'yes': 'oui',
        'no': 'non',
        'book': 'livre',
        'teacher': 'professeur',
        'student': 'étudiant'
      },
      'de': {
        // German translations
        'hello': 'hallo',
        'goodbye': 'auf wiedersehen',
        'thank you': 'danke',
        'please': 'bitte',
        'yes': 'ja',
        'no': 'nein',
        'book': 'buch',
        'teacher': 'lehrer',
        'student': 'student'
      },
      'zh': {
        // Chinese translations
        'hello': '你好',
        'goodbye': '再见',
        'thank you': '谢谢',
        'please': '请',
        'yes': '是',
        'no': '不',
        'book': '书',
        'teacher': '老师',
        'student': '学生'
      }
    };

    const lowerText = text.toLowerCase();
    const translations = mockTranslations[targetLanguage] || {};
    
    // Check if we have a direct translation
    if (translations[lowerText]) {
      return {
        translatedText: translations[lowerText],
        detectedSourceLanguage: 'en'
      };
    }

    // For demo, just return a placeholder translation
    return {
      translatedText: `[${targetLanguage}] ${text}`,
      detectedSourceLanguage: 'en'
    };
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'ru', name: 'Russian' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'zh', name: 'Chinese (Simplified)' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'it', name: 'Italian' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' },
      { code: 'tr', name: 'Turkish' },
      { code: 'uk', name: 'Ukrainian' }
    ];
  }

  /**
   * Alternative: Use LibreTranslate (free, open-source)
   * This is a fallback option that doesn't require API keys
   */
  async translateWithLibre(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<TranslationResult | TranslationError> {
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error('LibreTranslate API error');
      }

      const data = await response.json();
      
      return {
        translatedText: data.translatedText,
        detectedSourceLanguage: sourceLanguage
      };
    } catch (error) {
      console.error('LibreTranslate error:', error);
      // Fallback to mock translation
      return this.mockTranslate(text, targetLanguage);
    }
  }
}

export const translationService = new TranslationService();