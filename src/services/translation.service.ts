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
      // Always use mock translation for now since LibreTranslate has CORS issues
      // and Google Translate API requires proper API key
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
    // Enhanced mock translations with more comprehensive vocabulary
    const mockTranslations: Record<string, Record<string, string>> = {
      'ru': {
        // Common greetings and phrases
        'hey': 'эй',
        'hi': 'привет',
        'hello': 'привет',
        'good morning': 'доброе утро',
        'good afternoon': 'добрый день',
        'good evening': 'добрый вечер',
        'good night': 'спокойной ночи',
        'goodbye': 'до свидания',
        'bye': 'пока',
        'see you': 'увидимся',
        'thank you': 'спасибо',
        'thanks': 'спасибо',
        'please': 'пожалуйста',
        'sorry': 'извините',
        'excuse me': 'простите',
        'yes': 'да',
        'no': 'нет',
        'maybe': 'может быть',
        'ok': 'хорошо',
        'good': 'хорошо',
        'bad': 'плохо',
        'excellent': 'отлично',
        'great': 'отлично',
        'wonderful': 'замечательно',
        'beautiful': 'красивый',
        'nice': 'милый',
        'cool': 'круто',
        
        // Common classroom vocabulary
        'book': 'книга',
        'pen': 'ручка',
        'pencil': 'карандаш',
        'paper': 'бумага',
        'notebook': 'тетрадь',
        'textbook': 'учебник',
        'dictionary': 'словарь',
        'computer': 'компьютер',
        'phone': 'телефон',
        'tablet': 'планшет',
        'board': 'доска',
        'desk': 'парта',
        'table': 'стол',
        'chair': 'стул',
        'window': 'окно',
        'door': 'дверь',
        'wall': 'стена',
        'floor': 'пол',
        'ceiling': 'потолок',
        'classroom': 'класс',
        'house': 'дом',
        'home': 'дом',
        'school': 'школа',
        'university': 'университет',
        'library': 'библиотека',
        
        // People
        'teacher': 'учитель',
        'student': 'студент',
        'pupil': 'ученик',
        'friend': 'друг',
        'family': 'семья',
        'mother': 'мама',
        'father': 'папа',
        'sister': 'сестра',
        'brother': 'брат',
        'man': 'мужчина',
        'woman': 'женщина',
        'boy': 'мальчик',
        'girl': 'девочка',
        'child': 'ребенок',
        'children': 'дети',
        'person': 'человек',
        'people': 'люди',
        
        // Education terms
        'lesson': 'урок',
        'class': 'класс',
        'homework': 'домашнее задание',
        'test': 'тест',
        'exam': 'экзамен',
        'exercise': 'упражнение',
        'task': 'задание',
        'question': 'вопрос',
        'answer': 'ответ',
        'grade': 'оценка',
        'mark': 'отметка',
        'subject': 'предмет',
        'math': 'математика',
        'history': 'история',
        'science': 'наука',
        'language': 'язык',
        'english': 'английский',
        'russian': 'русский',
        
        // Common verbs
        'read': 'читать',
        'write': 'писать',
        'speak': 'говорить',
        'listen': 'слушать',
        'understand': 'понимать',
        'learn': 'учить',
        'study': 'изучать',
        'teach': 'преподавать',
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
        'can': 'мочь',
        'must': 'должен',
        'have': 'иметь',
        'do': 'делать',
        'make': 'делать',
        'go': 'идти',
        'come': 'приходить',
        'see': 'видеть',
        'look': 'смотреть',
        'give': 'давать',
        'take': 'брать',
        'help': 'помогать',
        'work': 'работать',
        'play': 'играть',
        'eat': 'есть',
        'drink': 'пить',
        'sleep': 'спать',
        'run': 'бежать',
        'walk': 'ходить',
        'sit': 'сидеть',
        'stand': 'стоять',
        'open': 'открывать',
        'close': 'закрывать',
        'start': 'начинать',
        'finish': 'заканчивать',
        'stop': 'останавливать',
        'begin': 'начинать',
        'end': 'заканчивать',
        'ask': 'спрашивать',
        'tell': 'рассказывать',
        'show': 'показывать',
        'explain': 'объяснять',
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

    const lowerText = text.toLowerCase().trim();
    const translations = mockTranslations[targetLanguage] || {};
    
    // Check if we have a direct translation
    if (translations[lowerText]) {
      return {
        translatedText: translations[lowerText],
        detectedSourceLanguage: 'en'
      };
    }

    // Try to find partial matches for compound words
    const words = lowerText.split(' ');
    const translatedWords = words.map(word => {
      if (translations[word]) {
        return translations[word];
      }
      // Return the original word if no translation found
      return word;
    });
    
    // If at least one word was translated, return the result
    const translatedText = translatedWords.join(' ');
    if (translatedText !== lowerText) {
      return {
        translatedText: translatedText,
        detectedSourceLanguage: 'en'
      };
    }

    // For any untranslated text, provide a phonetic transliteration for Russian
    if (targetLanguage === 'ru') {
      const transliterated = this.transliterateToRussian(lowerText);
      return {
        translatedText: transliterated,
        detectedSourceLanguage: 'en'
      };
    }
    
    // For other languages, return with language indicator
    const languageIndicators: Record<string, string> = {
      'es': text + ' (ES)',
      'fr': text + ' (FR)',
      'de': text + ' (DE)',
      'zh': text + ' (中)',
      'ja': text + ' (日)',
      'ko': text + ' (한)'
    };
    
    return {
      translatedText: languageIndicators[targetLanguage] || text,
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
   * Transliterate English text to Russian characters
   */
  private transliterateToRussian(text: string): string {
    const transliterationMap: Record<string, string> = {
      'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'yo': 'ё',
      'zh': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м',
      'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у',
      'f': 'ф', 'h': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш', 'sch': 'щ',
      'yu': 'ю', 'ya': 'я'
    };
    
    let result = text.toLowerCase();
    
    // Replace digraphs first
    result = result.replace(/sch/g, 'щ');
    result = result.replace(/sh/g, 'ш');
    result = result.replace(/ch/g, 'ч');
    result = result.replace(/ts/g, 'ц');
    result = result.replace(/zh/g, 'ж');
    result = result.replace(/yo/g, 'ё');
    result = result.replace(/yu/g, 'ю');
    result = result.replace(/ya/g, 'я');
    
    // Then replace single characters
    result = result.split('').map(char => {
      return transliterationMap[char] || char;
    }).join('');
    
    return result;
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
      // Try multiple LibreTranslate instances
      const instances = [
        'https://translate.terraprint.co/translate',
        'https://libretranslate.de/translate',
        'https://translate.argosopentech.com/translate'
      ];
      
      let lastError;
      for (const instance of instances) {
        try {
          const response = await fetch(instance, {
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

          if (response.ok) {
            const data = await response.json();
            return {
              translatedText: data.translatedText,
              detectedSourceLanguage: sourceLanguage
            };
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      throw lastError || new Error('All translation instances failed');
    } catch (error) {
      console.error('LibreTranslate error:', error);
      // Fallback to mock translation
      return this.mockTranslate(text, targetLanguage);
    }
  }
}

export const translationService = new TranslationService();