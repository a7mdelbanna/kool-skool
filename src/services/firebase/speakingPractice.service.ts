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
  Timestamp,
  deleteDoc,
  onSnapshot,
  limit,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot
} from 'firebase/storage';
import { db, storage, getUserSchoolId } from '@/config/firebase';

// Type definitions
export interface SpeakingTopic {
  id?: string;
  teacher_id: string;
  school_id: string;
  name: string;
  description?: string;
  genre: 'conversation' | 'presentation' | 'debate' | 'storytelling' | 'interview' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  materials: string[]; // URLs to attached files
  video_urls: string[];
  scheduled_release?: Date;
  is_published: boolean;
  vocabulary_hints: string[];
  instructions: string;
  example_response_url?: string;
  rubric_template?: RubricTemplate;
  estimated_duration?: number; // in minutes
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SpeakingConversation {
  id?: string;
  topic_id: string;
  student_id: string;
  teacher_id: string;
  school_id: string;
  status: 'not_started' | 'in_progress' | 'awaiting_feedback' | 'completed' | 'archived';
  started_at?: Date;
  last_activity: Date;
  completed_at?: Date;
  teacher_rating?: number;
  student_rating?: number;
  teacher_rating_comment?: string;
  student_rating_comment?: string;
  total_messages: number;
  total_speaking_time: number; // in seconds
  vocabulary_added: string[];
  created_at: Date;
}

export interface SpeakingMessage {
  id?: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'teacher' | 'student';
  message_type: 'prompt' | 'response' | 'follow_up';
  audio_url: string;
  duration: number; // in seconds
  file_size?: number; // in bytes
  transcription?: string;
  auto_transcription?: string; // AI-generated transcription
  timestamp: Date;
  listened: boolean;
  listened_at?: Date;
  feedback_count: number;
  order_index: number; // For maintaining message order
}

export interface SpeakingFeedback {
  id?: string;
  message_id: string;
  conversation_id: string;
  teacher_id: string;
  type: 'audio' | 'video' | 'text';
  content_url?: string; // For audio/video
  content_text?: string; // For text feedback
  timestamp_start?: number; // For inline feedback (seconds)
  timestamp_end?: number;
  category: 'pronunciation' | 'grammar' | 'vocabulary' | 'fluency' | 'content' | 'general';
  severity?: 'error' | 'suggestion' | 'praise';
  created_at: Date;
}

export interface SpeakingAssessment {
  id?: string;
  conversation_id: string;
  teacher_id: string;
  pronunciation_score: number; // 1-5
  fluency_score: number; // 1-5
  vocabulary_score: number; // 1-5
  grammar_score: number; // 1-5
  content_score: number; // 1-5
  task_completion_score: number; // 1-5
  overall_score: number; // calculated average
  strengths: string[];
  improvements: string[];
  detailed_comments?: string;
  vocabulary_extracted: VocabularyItem[];
  created_at: Date;
}

export interface RubricTemplate {
  pronunciation: RubricCriteria;
  fluency: RubricCriteria;
  vocabulary: RubricCriteria;
  grammar: RubricCriteria;
  content: RubricCriteria;
  task_completion: RubricCriteria;
}

export interface RubricCriteria {
  weight: number; // Percentage weight in final score
  description: string;
  levels: {
    score: number;
    description: string;
  }[];
}

export interface VocabularyItem {
  english: string;
  translation?: string;
  context?: string;
  timestamp?: number;
}

export interface AudioUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

export interface SpeakingAssignment {
  id?: string;
  topic_id: string;
  student_id: string;
  student_name?: string; // For display purposes
  teacher_id: string;
  school_id: string;
  assigned_at: Date;
  scheduled_for?: Date; // When the student should see it
  due_date?: Date; // Optional deadline
  status: 'scheduled' | 'active' | 'in_progress' | 'completed' | 'overdue';
  completion_date?: Date;
  conversation_id?: string; // Link to conversation once started
  teacher_intro_audio?: string; // Optional teacher introduction
  teacher_intro_text?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string; // Teacher notes about the assignment
  created_at: Date;
  updated_at: Date;
}

class SpeakingPracticeService {
  private readonly TOPICS_COLLECTION = 'speaking_topics';
  private readonly CONVERSATIONS_COLLECTION = 'speaking_conversations';
  private readonly MESSAGES_COLLECTION = 'speaking_messages';
  private readonly FEEDBACK_COLLECTION = 'speaking_feedback';
  private readonly ASSESSMENTS_COLLECTION = 'speaking_assessments';
  private readonly ASSIGNMENTS_COLLECTION = 'speaking_assignments';
  
  // Storage paths
  private readonly AUDIO_STORAGE_PATH = 'speaking-audio';
  private readonly MATERIALS_STORAGE_PATH = 'speaking-materials';
  
  // === Topic Management ===
  
  async createTopic(topic: Omit<SpeakingTopic, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const schoolId = await getUserSchoolId();
      if (!schoolId) throw new Error('No school ID found');
      
      const topicData = {
        ...topic,
        school_id: schoolId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.TOPICS_COLLECTION), topicData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  }
  
  async updateTopic(topicId: string, updates: Partial<SpeakingTopic>): Promise<void> {
    try {
      await updateDoc(doc(db, this.TOPICS_COLLECTION, topicId), {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating topic:', error);
      throw error;
    }
  }
  
  async getTopic(topicId: string): Promise<SpeakingTopic | null> {
    try {
      const docSnap = await getDoc(doc(db, this.TOPICS_COLLECTION, topicId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SpeakingTopic;
      }
      return null;
    } catch (error) {
      console.error('Error getting topic:', error);
      return null;
    }
  }
  
  async getTeacherTopics(teacherId: string): Promise<SpeakingTopic[]> {
    try {
      const schoolId = await getUserSchoolId();
      if (!schoolId) return [];
      
      const q = query(
        collection(db, this.TOPICS_COLLECTION),
        where('school_id', '==', schoolId),
        where('teacher_id', '==', teacherId),
        orderBy('created_at', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpeakingTopic));
    } catch (error) {
      console.error('Error getting teacher topics:', error);
      return [];
    }
  }
  
  async getPublishedTopics(): Promise<SpeakingTopic[]> {
    try {
      const schoolId = await getUserSchoolId();
      if (!schoolId) return [];
      
      const now = Timestamp.now();
      const q = query(
        collection(db, this.TOPICS_COLLECTION),
        where('school_id', '==', schoolId),
        where('is_published', '==', true),
        orderBy('created_at', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SpeakingTopic))
        .filter(topic => !topic.scheduled_release || topic.scheduled_release <= now.toDate());
    } catch (error) {
      console.error('Error getting published topics:', error);
      return [];
    }
  }
  
  // === Conversation Management ===
  
  async startConversation(topicId: string, studentId: string, teacherId: string): Promise<string> {
    try {
      const schoolId = await getUserSchoolId();
      if (!schoolId) throw new Error('No school ID found');
      
      const conversationData: Omit<SpeakingConversation, 'id'> = {
        topic_id: topicId,
        student_id: studentId,
        teacher_id: teacherId,
        school_id: schoolId,
        status: 'not_started',
        last_activity: new Date(),
        total_messages: 0,
        total_speaking_time: 0,
        vocabulary_added: [],
        created_at: new Date()
      };
      
      const docRef = await addDoc(collection(db, this.CONVERSATIONS_COLLECTION), conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }
  
  async getConversation(conversationId: string): Promise<SpeakingConversation | null> {
    try {
      const docSnap = await getDoc(doc(db, this.CONVERSATIONS_COLLECTION, conversationId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SpeakingConversation;
      }
      return null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }
  
  async getStudentConversations(studentId: string): Promise<SpeakingConversation[]> {
    try {
      const q = query(
        collection(db, this.CONVERSATIONS_COLLECTION),
        where('student_id', '==', studentId),
        orderBy('last_activity', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpeakingConversation));
    } catch (error) {
      console.error('Error getting student conversations:', error);
      return [];
    }
  }
  
  async getTeacherConversations(teacherId: string, status?: string): Promise<SpeakingConversation[]> {
    try {
      const constraints: any[] = [
        where('teacher_id', '==', teacherId)
      ];
      
      if (status) {
        constraints.push(where('status', '==', status));
      }
      
      constraints.push(orderBy('last_activity', 'desc'));
      
      const q = query(
        collection(db, this.CONVERSATIONS_COLLECTION),
        ...constraints
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpeakingConversation));
    } catch (error) {
      console.error('Error getting teacher conversations:', error);
      return [];
    }
  }
  
  async updateConversationStatus(
    conversationId: string, 
    status: SpeakingConversation['status']
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        last_activity: serverTimestamp()
      };
      
      if (status === 'completed') {
        updates.completed_at = serverTimestamp();
      } else if (status === 'in_progress' && !updates.started_at) {
        updates.started_at = serverTimestamp();
      }
      
      await updateDoc(doc(db, this.CONVERSATIONS_COLLECTION, conversationId), updates);
    } catch (error) {
      console.error('Error updating conversation status:', error);
      throw error;
    }
  }
  
  // === Message Management ===
  
  async addMessage(
    message: Omit<SpeakingMessage, 'id' | 'timestamp' | 'listened' | 'feedback_count'>
  ): Promise<string> {
    try {
      const messageData = {
        ...message,
        timestamp: serverTimestamp(),
        listened: false,
        feedback_count: 0
      };
      
      const docRef = await addDoc(collection(db, this.MESSAGES_COLLECTION), messageData);
      
      // Update conversation stats
      await this.updateConversationStats(message.conversation_id, message.duration);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }
  
  async getConversationMessages(conversationId: string): Promise<SpeakingMessage[]> {
    try {
      const q = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('conversation_id', '==', conversationId),
        orderBy('order_index', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpeakingMessage));
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
  
  async markMessageAsListened(messageId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.MESSAGES_COLLECTION, messageId), {
        listened: true,
        listened_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking message as listened:', error);
    }
  }
  
  // === Feedback Management ===
  
  async addFeedback(feedback: Omit<SpeakingFeedback, 'id' | 'created_at'>): Promise<string> {
    try {
      const feedbackData = {
        ...feedback,
        created_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.FEEDBACK_COLLECTION), feedbackData);
      
      // Update message feedback count
      const messageRef = doc(db, this.MESSAGES_COLLECTION, feedback.message_id);
      await updateDoc(messageRef, {
        feedback_count: (await getDoc(messageRef)).data()?.feedback_count + 1 || 1
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding feedback:', error);
      throw error;
    }
  }
  
  async getMessageFeedback(messageId: string): Promise<SpeakingFeedback[]> {
    try {
      const q = query(
        collection(db, this.FEEDBACK_COLLECTION),
        where('message_id', '==', messageId),
        orderBy('created_at', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpeakingFeedback));
    } catch (error) {
      console.error('Error getting feedback:', error);
      return [];
    }
  }
  
  // === Assessment Management ===
  
  async createAssessment(assessment: Omit<SpeakingAssessment, 'id' | 'created_at'>): Promise<string> {
    try {
      // Calculate overall score
      const scores = [
        assessment.pronunciation_score,
        assessment.fluency_score,
        assessment.vocabulary_score,
        assessment.grammar_score,
        assessment.content_score,
        assessment.task_completion_score
      ];
      
      const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      const assessmentData = {
        ...assessment,
        overall_score: Math.round(overall * 10) / 10,
        created_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.ASSESSMENTS_COLLECTION), assessmentData);
      
      // Mark conversation as completed
      await this.updateConversationStatus(assessment.conversation_id, 'completed');
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  }
  
  async getAssessment(conversationId: string): Promise<SpeakingAssessment | null> {
    try {
      const q = query(
        collection(db, this.ASSESSMENTS_COLLECTION),
        where('conversation_id', '==', conversationId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SpeakingAssessment;
      }
      return null;
    } catch (error) {
      console.error('Error getting assessment:', error);
      return null;
    }
  }
  
  // === Audio File Management ===
  
  async uploadAudio(
    audioBlob: Blob,
    conversationId: string,
    messageId: string,
    onProgress?: (progress: AudioUploadProgress) => void
  ): Promise<string> {
    try {
      const fileName = `${conversationId}/${messageId}_${Date.now()}.webm`;
      const storageRef = ref(storage, `${this.AUDIO_STORAGE_PATH}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, audioBlob, {
        contentType: 'audio/webm'
      });
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress: AudioUploadProgress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              state: snapshot.state as any
            };
            onProgress?.(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  }
  
  async uploadMaterial(file: File, topicId: string): Promise<string> {
    try {
      const fileName = `${topicId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `${this.MATERIALS_STORAGE_PATH}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading material:', error);
      throw error;
    }
  }
  
  async deleteAudio(audioUrl: string): Promise<void> {
    try {
      const audioRef = ref(storage, audioUrl);
      await deleteObject(audioRef);
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  }
  
  // === Rating System ===
  
  async rateConversation(
    conversationId: string,
    raterType: 'teacher' | 'student',
    rating: number,
    comment?: string
  ): Promise<void> {
    try {
      const updates: any = {};
      
      if (raterType === 'teacher') {
        updates.teacher_rating = rating;
        if (comment) updates.teacher_rating_comment = comment;
      } else {
        updates.student_rating = rating;
        if (comment) updates.student_rating_comment = comment;
      }
      
      await updateDoc(doc(db, this.CONVERSATIONS_COLLECTION, conversationId), updates);
    } catch (error) {
      console.error('Error rating conversation:', error);
      throw error;
    }
  }
  
  // === Real-time Listeners ===
  
  subscribeToConversation(
    conversationId: string,
    onUpdate: (messages: SpeakingMessage[]) => void
  ): () => void {
    const q = query(
      collection(db, this.MESSAGES_COLLECTION),
      where('conversation_id', '==', conversationId),
      orderBy('order_index', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as SpeakingMessage));
      onUpdate(messages);
    });
    
    return unsubscribe;
  }
  
  subscribeToStudentTasks(
    studentId: string,
    onUpdate: (tasks: SpeakingConversation[]) => void
  ): () => void {
    const q = query(
      collection(db, this.CONVERSATIONS_COLLECTION),
      where('student_id', '==', studentId),
      where('status', 'in', ['not_started', 'in_progress', 'awaiting_feedback']),
      orderBy('last_activity', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as SpeakingConversation));
      onUpdate(tasks);
    });
    
    return unsubscribe;
  }
  
  // === Helper Methods ===
  
  private async updateConversationStats(conversationId: string, duration: number): Promise<void> {
    try {
      const conversationRef = doc(db, this.CONVERSATIONS_COLLECTION, conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        const data = conversationDoc.data();
        await updateDoc(conversationRef, {
          total_messages: (data.total_messages || 0) + 1,
          total_speaking_time: (data.total_speaking_time || 0) + duration,
          last_activity: serverTimestamp(),
          status: data.status === 'not_started' ? 'in_progress' : data.status
        });
      }
    } catch (error) {
      console.error('Error updating conversation stats:', error);
    }
  }
  
  // === Analytics ===
  
  async getStudentSpeakingStats(studentId: string): Promise<{
    totalConversations: number;
    completedConversations: number;
    totalSpeakingTime: number;
    averageRating: number;
    vocabularyLearned: number;
  }> {
    try {
      const q = query(
        collection(db, this.CONVERSATIONS_COLLECTION),
        where('student_id', '==', studentId)
      );
      
      const snapshot = await getDocs(q);
      const conversations = snapshot.docs.map(doc => doc.data() as SpeakingConversation);
      
      const completed = conversations.filter(c => c.status === 'completed');
      const totalTime = conversations.reduce((sum, c) => sum + (c.total_speaking_time || 0), 0);
      const totalVocab = conversations.reduce((sum, c) => sum + (c.vocabulary_added?.length || 0), 0);
      
      // Get assessments for average rating
      let totalRating = 0;
      let ratingCount = 0;
      
      for (const conv of completed) {
        const assessment = await this.getAssessment(conv.id!);
        if (assessment) {
          totalRating += assessment.overall_score;
          ratingCount++;
        }
      }
      
      return {
        totalConversations: conversations.length,
        completedConversations: completed.length,
        totalSpeakingTime: totalTime,
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        vocabularyLearned: totalVocab
      };
    } catch (error) {
      console.error('Error getting student stats:', error);
      return {
        totalConversations: 0,
        completedConversations: 0,
        totalSpeakingTime: 0,
        averageRating: 0,
        vocabularyLearned: 0
      };
    }
  }

  // === Assignment Management ===
  
  async assignTopicToStudents(
    topicId: string,
    studentIds: string[],
    options: {
      scheduledFor?: Date;
      dueDate?: Date;
      priority?: 'low' | 'medium' | 'high';
      teacherIntroAudio?: string;
      teacherIntroText?: string;
      notes?: string;
    } = {}
  ): Promise<string[]> {
    try {
      const schoolId = await getUserSchoolId();
      if (!schoolId) throw new Error('No school ID found');
      
      const topic = await this.getTopic(topicId);
      if (!topic) throw new Error('Topic not found');
      
      const assignmentIds: string[] = [];
      const now = new Date();
      
      for (const studentId of studentIds) {
        const assignmentData: Omit<SpeakingAssignment, 'id'> = {
          topic_id: topicId,
          student_id: studentId,
          teacher_id: topic.teacher_id,
          school_id: schoolId,
          assigned_at: now,
          scheduled_for: options.scheduledFor,
          due_date: options.dueDate,
          status: options.scheduledFor && options.scheduledFor > now ? 'scheduled' : 'active',
          priority: options.priority || 'medium',
          teacher_intro_audio: options.teacherIntroAudio,
          teacher_intro_text: options.teacherIntroText,
          notes: options.notes,
          created_at: now,
          updated_at: now
        };
        
        const docRef = await addDoc(collection(db, this.ASSIGNMENTS_COLLECTION), {
          ...assignmentData,
          assigned_at: serverTimestamp(),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        assignmentIds.push(docRef.id);
      }
      
      return assignmentIds;
    } catch (error) {
      console.error('Error assigning topic to students:', error);
      throw error;
    }
  }
  
  async getStudentAssignments(studentId: string, status?: string): Promise<SpeakingAssignment[]> {
    try {
      const constraints: any[] = [
        where('student_id', '==', studentId)
      ];
      
      if (status) {
        constraints.push(where('status', '==', status));
      }
      
      constraints.push(orderBy('created_at', 'desc'));
      
      const q = query(collection(db, this.ASSIGNMENTS_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      
      const now = new Date();
      const assignments: SpeakingAssignment[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const assignment = { id: doc.id, ...data } as SpeakingAssignment;
        
        // Update status based on dates
        if (assignment.status === 'scheduled' && assignment.scheduled_for && assignment.scheduled_for <= now) {
          assignment.status = 'active';
          await this.updateAssignment(doc.id, { status: 'active' });
        } else if (assignment.status === 'active' && assignment.due_date && assignment.due_date < now) {
          assignment.status = 'overdue';
          await this.updateAssignment(doc.id, { status: 'overdue' });
        }
        
        assignments.push(assignment);
      }
      
      return assignments;
    } catch (error) {
      console.error('Error getting student assignments:', error);
      throw error;
    }
  }
  
  async getTopicAssignments(topicId: string): Promise<SpeakingAssignment[]> {
    try {
      const q = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('topic_id', '==', topicId),
        orderBy('created_at', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpeakingAssignment));
    } catch (error) {
      console.error('Error getting topic assignments:', error);
      throw error;
    }
  }
  
  async updateAssignment(assignmentId: string, updates: Partial<SpeakingAssignment>): Promise<void> {
    try {
      await updateDoc(doc(db, this.ASSIGNMENTS_COLLECTION, assignmentId), {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }
  
  async removeAssignment(assignmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.ASSIGNMENTS_COLLECTION, assignmentId));
    } catch (error) {
      console.error('Error removing assignment:', error);
      throw error;
    }
  }
  
  async getAssignedTopicsForStudent(studentId: string): Promise<(SpeakingTopic & { assignment: SpeakingAssignment })[]> {
    try {
      const assignments = await this.getStudentAssignments(studentId);
      const topicsWithAssignments: (SpeakingTopic & { assignment: SpeakingAssignment })[] = [];
      
      for (const assignment of assignments) {
        const topic = await this.getTopic(assignment.topic_id);
        if (topic && topic.is_published) {
          topicsWithAssignments.push({
            ...topic,
            assignment
          });
        }
      }
      
      return topicsWithAssignments;
    } catch (error) {
      console.error('Error getting assigned topics for student:', error);
      throw error;
    }
  }
}

export const speakingPracticeService = new SpeakingPracticeService();