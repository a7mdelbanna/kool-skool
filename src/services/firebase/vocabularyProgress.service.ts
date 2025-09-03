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
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface VocabularyProgress {
  id?: string;
  student_id: string;
  word_id: string; // Combination of english-translation to uniquely identify
  english: string;
  translation: string;
  session_id?: string;
  
  // Progress tracking
  mastery_level: number; // 0-100
  practice_count: number;
  correct_count: number;
  incorrect_count: number;
  
  // Spaced repetition
  last_practiced: Date | null;
  next_review: Date | null;
  interval_days: number; // Days until next review
  ease_factor: number; // Difficulty multiplier (2.5 default)
  
  // Gamification
  xp_earned: number;
  streak_count: number;
  best_streak: number;
  
  // Performance metrics
  average_response_time: number; // milliseconds
  last_response_time: number;
  
  created_at: Date;
  updated_at: Date;
}

export interface PracticeSession {
  id?: string;
  student_id: string;
  session_type: 'flashcards' | 'matching' | 'typing' | 'mixed';
  
  // Session details
  total_words: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy_rate: number;
  
  // Time tracking
  start_time: Date;
  end_time: Date;
  duration_seconds: number;
  
  // Gamification
  xp_earned: number;
  achievements_unlocked: string[];
  combo_best: number;
  
  // Words practiced
  word_ids: string[];
  session_ids?: string[]; // Original session IDs if filtering by session
  
  created_at: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  type: 'milestone' | 'streak' | 'mastery' | 'speed' | 'accuracy';
  requirement: number;
  unlocked: boolean;
  unlocked_at?: Date;
}

class VocabularyProgressService {
  private readonly COLLECTION_NAME = 'vocabulary_progress';
  private readonly SESSIONS_COLLECTION = 'practice_sessions';
  private readonly ACHIEVEMENTS_COLLECTION = 'achievements';

  // Spaced Repetition Algorithm (SM-2 based)
  private calculateNextReview(
    quality: number, // 0-5 (0=complete fail, 5=perfect)
    previousInterval: number = 1,
    easeFactor: number = 2.5
  ): { interval: number; easeFactor: number } {
    // Adjust ease factor
    let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor); // Minimum ease factor

    // Calculate interval
    let interval: number;
    if (quality < 3) {
      interval = 1; // Reset to 1 day if answer was incorrect
    } else {
      if (previousInterval === 1) {
        interval = 6; // First review after 6 days
      } else {
        interval = Math.round(previousInterval * newEaseFactor);
      }
    }

    return { interval, easeFactor: newEaseFactor };
  }

  // Get or create progress for a word
  async getWordProgress(
    studentId: string, 
    wordId: string
  ): Promise<VocabularyProgress | null> {
    try {
      const progressQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId),
        where('word_id', '==', wordId)
      );
      
      const snapshot = await getDocs(progressQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as VocabularyProgress;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting word progress:', error);
      return null;
    }
  }

  // Create or update word progress
  async updateWordProgress(
    studentId: string,
    word: {
      english: string;
      translation: string;
      session_id?: string;
    },
    practiceResult: {
      correct: boolean;
      responseTime: number;
      practiceType: 'flashcard' | 'matching' | 'typing';
    }
  ): Promise<void> {
    try {
      const wordId = `${word.english}-${word.translation}`;
      let progress = await this.getWordProgress(studentId, wordId);
      
      const quality = practiceResult.correct ? 5 : 2; // Simple quality calculation
      
      if (!progress) {
        // Create new progress record
        progress = {
          student_id: studentId,
          word_id: wordId,
          english: word.english,
          translation: word.translation,
          session_id: word.session_id,
          mastery_level: practiceResult.correct ? 20 : 0,
          practice_count: 1,
          correct_count: practiceResult.correct ? 1 : 0,
          incorrect_count: practiceResult.correct ? 0 : 1,
          last_practiced: new Date(),
          next_review: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          interval_days: 1,
          ease_factor: 2.5,
          xp_earned: practiceResult.correct ? 10 : 2,
          streak_count: practiceResult.correct ? 1 : 0,
          best_streak: practiceResult.correct ? 1 : 0,
          average_response_time: practiceResult.responseTime,
          last_response_time: practiceResult.responseTime,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        await addDoc(collection(db, this.COLLECTION_NAME), progress);
      } else {
        // Update existing progress
        const { interval, easeFactor } = this.calculateNextReview(
          quality,
          progress.interval_days,
          progress.ease_factor
        );
        
        // Calculate new mastery level
        const correctRate = (progress.correct_count + (practiceResult.correct ? 1 : 0)) / 
                          (progress.practice_count + 1);
        const newMasteryLevel = Math.min(100, Math.round(correctRate * 100));
        
        // Update streak
        const newStreak = practiceResult.correct ? (progress.streak_count + 1) : 0;
        const bestStreak = Math.max(progress.best_streak, newStreak);
        
        // Calculate average response time
        const avgResponseTime = (
          (progress.average_response_time * progress.practice_count) + practiceResult.responseTime
        ) / (progress.practice_count + 1);
        
        const updates = {
          practice_count: increment(1),
          correct_count: practiceResult.correct ? increment(1) : progress.correct_count,
          incorrect_count: practiceResult.correct ? progress.incorrect_count : increment(1),
          mastery_level: newMasteryLevel,
          last_practiced: serverTimestamp(),
          next_review: new Date(Date.now() + interval * 24 * 60 * 60 * 1000),
          interval_days: interval,
          ease_factor: easeFactor,
          xp_earned: increment(practiceResult.correct ? 10 : 2),
          streak_count: newStreak,
          best_streak: bestStreak,
          average_response_time: avgResponseTime,
          last_response_time: practiceResult.responseTime,
          updated_at: serverTimestamp()
        };
        
        if (progress.id) {
          await updateDoc(doc(db, this.COLLECTION_NAME, progress.id), updates);
        }
      }
    } catch (error) {
      console.error('Error updating word progress:', error);
      throw error;
    }
  }

  // Get all progress for a student
  async getStudentProgress(studentId: string): Promise<VocabularyProgress[]> {
    try {
      const progressQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId),
        orderBy('mastery_level', 'desc')
      );
      
      const snapshot = await getDocs(progressQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VocabularyProgress[];
    } catch (error) {
      console.error('Error getting student progress:', error);
      return [];
    }
  }

  // Get words due for review (spaced repetition)
  async getDueWords(studentId: string): Promise<VocabularyProgress[]> {
    try {
      const now = new Date();
      const progressQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('student_id', '==', studentId),
        where('next_review', '<=', Timestamp.fromDate(now)),
        orderBy('next_review', 'asc')
      );
      
      const snapshot = await getDocs(progressQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VocabularyProgress[];
    } catch (error) {
      console.error('Error getting due words:', error);
      return [];
    }
  }

  // Create a practice session
  async createPracticeSession(
    session: Omit<PracticeSession, 'id' | 'created_at'>
  ): Promise<string> {
    try {
      const sessionData = {
        ...session,
        created_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.SESSIONS_COLLECTION), sessionData);
      
      // Update student's total XP
      await this.updateStudentXP(session.student_id, session.xp_earned);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating practice session:', error);
      throw error;
    }
  }

  // Get practice history
  async getPracticeHistory(
    studentId: string, 
    limit: number = 10
  ): Promise<PracticeSession[]> {
    try {
      const historyQuery = query(
        collection(db, this.SESSIONS_COLLECTION),
        where('student_id', '==', studentId),
        orderBy('created_at', 'desc')
      );
      
      const snapshot = await getDocs(historyQuery);
      
      return snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PracticeSession[];
    } catch (error) {
      console.error('Error getting practice history:', error);
      return [];
    }
  }

  // Update student's total XP
  private async updateStudentXP(studentId: string, xpEarned: number): Promise<void> {
    try {
      const studentRef = doc(db, 'students', studentId);
      const studentDoc = await getDoc(studentRef);
      
      if (studentDoc.exists()) {
        const currentXP = studentDoc.data().total_xp || 0;
        await updateDoc(studentRef, {
          total_xp: currentXP + xpEarned,
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating student XP:', error);
    }
  }

  // Get student's achievements
  async getStudentAchievements(studentId: string): Promise<Achievement[]> {
    try {
      const achievementsQuery = query(
        collection(db, this.ACHIEVEMENTS_COLLECTION),
        where('student_id', '==', studentId)
      );
      
      const snapshot = await getDocs(achievementsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Achievement[];
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  // Check and unlock achievements
  async checkAchievements(
    studentId: string,
    stats: {
      totalWords: number;
      masteredWords: number;
      streak: number;
      accuracy: number;
      totalSessions: number;
    }
  ): Promise<string[]> {
    const unlockedAchievements: string[] = [];
    
    // Define achievement criteria
    const achievementCriteria = [
      { id: 'first_word', name: 'First Word', type: 'milestone', requirement: 1, check: stats.totalWords >= 1 },
      { id: 'ten_words', name: '10 Words Learned', type: 'milestone', requirement: 10, check: stats.totalWords >= 10 },
      { id: 'fifty_words', name: '50 Words Learned', type: 'milestone', requirement: 50, check: stats.totalWords >= 50 },
      { id: 'hundred_words', name: '100 Words Learned', type: 'milestone', requirement: 100, check: stats.totalWords >= 100 },
      { id: 'week_streak', name: 'Week Streak', type: 'streak', requirement: 7, check: stats.streak >= 7 },
      { id: 'month_streak', name: 'Month Streak', type: 'streak', requirement: 30, check: stats.streak >= 30 },
      { id: 'perfect_session', name: 'Perfect Session', type: 'accuracy', requirement: 100, check: stats.accuracy === 100 },
      { id: 'mastery_10', name: '10 Words Mastered', type: 'mastery', requirement: 10, check: stats.masteredWords >= 10 },
    ];
    
    for (const criteria of achievementCriteria) {
      if (criteria.check) {
        // Check if already unlocked
        const existing = await this.getStudentAchievements(studentId);
        const isUnlocked = existing.some(a => a.id === criteria.id);
        
        if (!isUnlocked) {
          // Unlock achievement
          await addDoc(collection(db, this.ACHIEVEMENTS_COLLECTION), {
            student_id: studentId,
            ...criteria,
            unlocked: true,
            unlocked_at: serverTimestamp(),
            xp_reward: criteria.requirement * 10
          });
          
          unlockedAchievements.push(criteria.name);
        }
      }
    }
    
    return unlockedAchievements;
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        orderBy('total_xp', 'desc')
      );
      
      const snapshot = await getDocs(studentsQuery);
      
      return snapshot.docs.slice(0, limit).map((doc, index) => ({
        rank: index + 1,
        id: doc.id,
        name: `${doc.data().first_name} ${doc.data().last_name}`,
        xp: doc.data().total_xp || 0,
        level: Math.floor((doc.data().total_xp || 0) / 1000) + 1
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}

export const vocabularyProgressService = new VocabularyProgressService();