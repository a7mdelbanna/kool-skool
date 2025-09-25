import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Type definitions
export interface DictionaryEntry {
  id?: string;
  student_id: string;
  word_id: string; // Unique identifier: english-translation
  english: string;
  translation: string;
  language: string; // Target language code (e.g., 'ru', 'es')

  // Source tracking
  source_type: 'session' | 'speaking' | 'manual' | 'ai_extracted' | 'teacher_added';
  source_id?: string; // Reference to session_id, conversation_id, etc.
  source_context?: string; // Original sentence where word was used

  // Learning data
  pronunciation_guide?: string; // Phonetic representation
  part_of_speech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'other';
  definition?: string; // Detailed explanation
  example_sentences?: string[]; // Usage examples
  synonyms?: string[];
  antonyms?: string[];

  // Progress tracking
  mastery_level: number; // 0-100
  review_count: number;
  correct_count: number;
  last_reviewed?: Date;
  next_review?: Date; // For spaced repetition

  // Metadata
  added_by: 'teacher' | 'student' | 'ai' | 'system';
  added_at: Date;
  updated_at: Date;
  tags?: string[]; // Custom tags for organization
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  cefr_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  // Speaking practice specific
  audio_pronunciation_url?: string; // Recorded pronunciation
  used_in_speaking?: boolean;
  speaking_context?: {
    conversation_id: string;
    timestamp: number; // When in the conversation
    teacher_feedback?: string;
  };
}

export interface DictionaryStats {
  total_words: number;
  words_by_source: {
    session: number;
    speaking: number;
    manual: number;
    ai_extracted: number;
    teacher_added: number;
  };
  mastery_distribution: {
    beginner: number; // 0-33%
    intermediate: number; // 34-66%
    advanced: number; // 67-100%
  };
  recent_additions: number; // Last 7 days
  due_for_review: number;
  average_mastery: number;
}

export interface WordSource {
  type: 'session' | 'speaking' | 'manual' | 'ai_extracted' | 'teacher_added';
  id?: string;
  context?: string;
  added_by: 'teacher' | 'student' | 'ai' | 'system';
}

class StudentDictionaryService {
  private readonly COLLECTION_NAME = 'student_dictionary';
  private readonly BATCH_SIZE = 50;

  // Add word to student's dictionary
  async addWord(
    studentId: string,
    word: {
      english: string;
      translation: string;
      language: string;
    },
    source: WordSource,
    additionalData?: Partial<DictionaryEntry>
  ): Promise<string> {
    try {
      const wordId = `${word.english.toLowerCase()}-${word.translation.toLowerCase()}`;

      // Check if word already exists for this student
      const existing = await this.getWordByWordId(studentId, wordId);

      if (existing) {
        // Update existing word with new source/context
        await this.updateWord(existing.id!, {
          review_count: (existing.review_count || 0) + 1,
          source_context: additionalData?.source_context || existing.source_context,
          updated_at: new Date()
        });
        return existing.id!;
      }

      // Create new dictionary entry
      const entry: Omit<DictionaryEntry, 'id'> = {
        student_id: studentId,
        word_id: wordId,
        english: word.english,
        translation: word.translation,
        language: word.language,
        source_type: source.type,
        source_id: source.id,
        source_context: additionalData?.source_context,
        pronunciation_guide: additionalData?.pronunciation_guide,
        part_of_speech: additionalData?.part_of_speech,
        definition: additionalData?.definition,
        example_sentences: additionalData?.example_sentences || [],
        synonyms: additionalData?.synonyms || [],
        antonyms: additionalData?.antonyms || [],
        mastery_level: 0,
        review_count: 0,
        correct_count: 0,
        added_by: source.added_by,
        added_at: new Date(),
        updated_at: new Date(),
        tags: additionalData?.tags || [],
        difficulty_level: additionalData?.difficulty_level,
        cefr_level: additionalData?.cefr_level,
        used_in_speaking: source.type === 'speaking',
        ...additionalData
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...entry,
        added_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding word to dictionary:', error);
      throw error;
    }
  }

  // Add multiple words at once (batch operation)
  async addWords(
    studentId: string,
    words: Array<{
      english: string;
      translation: string;
      language: string;
      additionalData?: Partial<DictionaryEntry>;
    }>,
    source: WordSource
  ): Promise<string[]> {
    const addedIds: string[] = [];

    for (const word of words) {
      try {
        const id = await this.addWord(
          studentId,
          {
            english: word.english,
            translation: word.translation,
            language: word.language
          },
          source,
          word.additionalData
        );
        addedIds.push(id);
      } catch (error) {
        console.error(`Error adding word ${word.english}:`, error);
      }
    }

    return addedIds;
  }

  // Get word by word_id
  async getWordByWordId(studentId: string, wordId: string): Promise<DictionaryEntry | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId),
        where('word_id', '==', wordId)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DictionaryEntry;
    } catch (error) {
      console.error('Error getting word:', error);
      return null;
    }
  }

  // Get all words for a student
  async getStudentDictionary(
    studentId: string,
    filters?: {
      source_type?: DictionaryEntry['source_type'];
      language?: string;
      mastery_level_min?: number;
      mastery_level_max?: number;
      tags?: string[];
      search?: string;
    },
    pagination?: {
      limit?: number;
      startAfter?: any;
    }
  ): Promise<{ words: DictionaryEntry[]; hasMore: boolean }> {
    try {
      // Simplified query without orderBy to avoid index requirement
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId)
      );

      // Apply filters
      if (filters?.source_type) {
        q = query(q, where('source_type', '==', filters.source_type));
      }

      if (filters?.language) {
        q = query(q, where('language', '==', filters.language));
      }

      // Get all documents first
      const snapshot = await getDocs(q);
      let words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DictionaryEntry[];

      // Sort client-side to avoid index requirement
      words.sort((a, b) => {
        const dateA = a.added_at instanceof Date ? a.added_at : new Date(a.added_at);
        const dateB = b.added_at instanceof Date ? b.added_at : new Date(b.added_at);
        return dateB.getTime() - dateA.getTime();
      });

      // Store hasMore status before slicing
      let hasMore = false;

      // Apply pagination client-side
      if (pagination?.limit) {
        hasMore = words.length > pagination.limit;
        if (hasMore) {
          words = words.slice(0, pagination.limit);
        }
        // Note: startAfter pagination won't work with client-side sorting
        // but it's not being used in the current implementation
      }

      // Client-side filtering for complex conditions
      if (filters?.mastery_level_min !== undefined) {
        words = words.filter(w => w.mastery_level >= filters.mastery_level_min!);
      }

      if (filters?.mastery_level_max !== undefined) {
        words = words.filter(w => w.mastery_level <= filters.mastery_level_max!);
      }

      if (filters?.tags && filters.tags.length > 0) {
        words = words.filter(w =>
          w.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        words = words.filter(w =>
          w.english.toLowerCase().includes(searchLower) ||
          w.translation.toLowerCase().includes(searchLower) ||
          w.definition?.toLowerCase().includes(searchLower)
        );
      }

      // Return words with hasMore status determined earlier
      return { words, hasMore };
    } catch (error) {
      console.error('Error getting student dictionary:', error);
      return { words: [], hasMore: false };
    }
  }

  // Get words from a specific source
  async getWordsBySource(
    studentId: string,
    sourceType: DictionaryEntry['source_type'],
    sourceId?: string
  ): Promise<DictionaryEntry[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId),
        where('source_type', '==', sourceType)
      );

      if (sourceId) {
        q = query(q, where('source_id', '==', sourceId));
      }

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DictionaryEntry[];
    } catch (error) {
      console.error('Error getting words by source:', error);
      return [];
    }
  }

  // Get words due for review (spaced repetition)
  async getWordsForReview(studentId: string, limitCount: number = 20): Promise<DictionaryEntry[]> {
    try {
      const now = new Date();

      // Simplified query - get all words for student then filter client-side
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId)
      );

      const snapshot = await getDocs(q);

      let words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DictionaryEntry[];

      // Filter for words due for review and sort client-side
      words = words.filter(word => {
        if (!word.next_review) return false;
        const reviewDate = word.next_review instanceof Date
          ? word.next_review
          : word.next_review.toDate();
        return reviewDate <= now;
      });

      // Sort by next_review date ascending
      words.sort((a, b) => {
        const dateA = a.next_review instanceof Date ? a.next_review : a.next_review!.toDate();
        const dateB = b.next_review instanceof Date ? b.next_review : b.next_review!.toDate();
        return dateA.getTime() - dateB.getTime();
      });

      // Apply limit
      return words.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting words for review:', error);
      return [];
    }
  }

  // Update word (e.g., after practice/review)
  async updateWord(wordId: string, updates: Partial<DictionaryEntry>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, wordId);

      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating word:', error);
      throw error;
    }
  }

  // Update mastery level after practice
  async updateMastery(
    wordId: string,
    correct: boolean,
    responseTime?: number
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, wordId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Word not found');
      }

      const word = docSnap.data() as DictionaryEntry;

      // Calculate new mastery level
      const currentMastery = word.mastery_level || 0;
      const reviewCount = (word.review_count || 0) + 1;
      const correctCount = (word.correct_count || 0) + (correct ? 1 : 0);

      // Simple mastery calculation: percentage of correct answers with decay
      const correctRate = correctCount / reviewCount;
      const newMastery = Math.min(100, Math.max(0, correctRate * 100));

      // Calculate next review date (spaced repetition)
      const daysUntilNext = correct
        ? Math.min(30, Math.ceil(Math.pow(2, correctCount / 3))) // Exponential spacing for correct
        : 1; // Review tomorrow if incorrect

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + daysUntilNext);

      await updateDoc(docRef, {
        mastery_level: newMastery,
        review_count: reviewCount,
        correct_count: correctCount,
        last_reviewed: serverTimestamp(),
        next_review: Timestamp.fromDate(nextReview),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating mastery:', error);
      throw error;
    }
  }

  // Get dictionary statistics
  async getStats(studentId: string): Promise<DictionaryStats> {
    try {
      const { words } = await this.getStudentDictionary(studentId);

      const stats: DictionaryStats = {
        total_words: words.length,
        words_by_source: {
          session: 0,
          speaking: 0,
          manual: 0,
          ai_extracted: 0,
          teacher_added: 0
        },
        mastery_distribution: {
          beginner: 0,
          intermediate: 0,
          advanced: 0
        },
        recent_additions: 0,
        due_for_review: 0,
        average_mastery: 0
      };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();

      let totalMastery = 0;

      words.forEach(word => {
        // Count by source
        stats.words_by_source[word.source_type]++;

        // Mastery distribution
        if (word.mastery_level <= 33) {
          stats.mastery_distribution.beginner++;
        } else if (word.mastery_level <= 66) {
          stats.mastery_distribution.intermediate++;
        } else {
          stats.mastery_distribution.advanced++;
        }

        // Recent additions
        if (word.added_at >= sevenDaysAgo) {
          stats.recent_additions++;
        }

        // Due for review
        if (word.next_review && word.next_review <= now) {
          stats.due_for_review++;
        }

        totalMastery += word.mastery_level;
      });

      stats.average_mastery = words.length > 0 ? totalMastery / words.length : 0;

      return stats;
    } catch (error) {
      console.error('Error getting dictionary stats:', error);
      return {
        total_words: 0,
        words_by_source: {
          session: 0,
          speaking: 0,
          manual: 0,
          ai_extracted: 0,
          teacher_added: 0
        },
        mastery_distribution: {
          beginner: 0,
          intermediate: 0,
          advanced: 0
        },
        recent_additions: 0,
        due_for_review: 0,
        average_mastery: 0
      };
    }
  }

  // Delete word from dictionary
  async deleteWord(wordId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, wordId));
    } catch (error) {
      console.error('Error deleting word:', error);
      throw error;
    }
  }

  // Export dictionary for student (e.g., as CSV or JSON)
  async exportDictionary(studentId: string): Promise<DictionaryEntry[]> {
    try {
      const { words } = await this.getStudentDictionary(studentId);
      return words;
    } catch (error) {
      console.error('Error exporting dictionary:', error);
      return [];
    }
  }
}

export const studentDictionaryService = new StudentDictionaryService();