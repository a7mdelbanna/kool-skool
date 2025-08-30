import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface VocabularyItem {
  id: string;
  english: string;
  translation: string;
  language: string;
  pronunciation?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: Date;
}

export interface SessionDetails {
  id?: string;
  session_id: string;
  teacher_id: string;
  student_id: string;
  topic?: string;
  notes?: string;
  vocabulary?: VocabularyItem[];
  attachments?: Attachment[];
  created_at?: Date;
  updated_at?: Date;
}

class SessionDetailsService {
  private collectionName = 'session_details';

  /**
   * Get session details by session ID
   */
  async getBySessionId(sessionId: string): Promise<SessionDetails | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('session_id', '==', sessionId)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate(),
        attachments: data.attachments?.map((att: any) => ({
          ...att,
          uploaded_at: att.uploaded_at?.toDate()
        }))
      } as SessionDetails;
    } catch (error) {
      console.error('Error getting session details:', error);
      throw error;
    }
  }

  /**
   * Create new session details
   */
  async create(details: SessionDetails): Promise<string> {
    try {
      const docRef = doc(collection(db, this.collectionName));
      const data = {
        ...details,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      await setDoc(docRef, data);
      return docRef.id;
    } catch (error) {
      console.error('Error creating session details:', error);
      throw error;
    }
  }

  /**
   * Update session details
   */
  async update(id: string, updates: Partial<SessionDetails>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating session details:', error);
      throw error;
    }
  }

  /**
   * Add vocabulary item
   */
  async addVocabularyItem(
    detailsId: string, 
    item: VocabularyItem
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, detailsId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session details not found');
      }
      
      const currentData = docSnap.data();
      const vocabulary = currentData.vocabulary || [];
      
      await updateDoc(docRef, {
        vocabulary: [...vocabulary, { ...item, id: Date.now().toString() }],
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding vocabulary item:', error);
      throw error;
    }
  }

  /**
   * Update vocabulary item
   */
  async updateVocabularyItem(
    detailsId: string,
    itemId: string,
    updates: Partial<VocabularyItem>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, detailsId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session details not found');
      }
      
      const currentData = docSnap.data();
      const vocabulary = currentData.vocabulary || [];
      
      const updatedVocabulary = vocabulary.map((item: VocabularyItem) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      
      await updateDoc(docRef, {
        vocabulary: updatedVocabulary,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating vocabulary item:', error);
      throw error;
    }
  }

  /**
   * Delete vocabulary item
   */
  async deleteVocabularyItem(
    detailsId: string,
    itemId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, detailsId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session details not found');
      }
      
      const currentData = docSnap.data();
      const vocabulary = currentData.vocabulary || [];
      
      const filteredVocabulary = vocabulary.filter(
        (item: VocabularyItem) => item.id !== itemId
      );
      
      await updateDoc(docRef, {
        vocabulary: filteredVocabulary,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting vocabulary item:', error);
      throw error;
    }
  }

  /**
   * Add attachment
   */
  async addAttachment(
    detailsId: string,
    attachment: Omit<Attachment, 'id' | 'uploaded_at'>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, detailsId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session details not found');
      }
      
      const currentData = docSnap.data();
      const attachments = currentData.attachments || [];
      
      const newAttachment = {
        ...attachment,
        id: Date.now().toString(),
        uploaded_at: Timestamp.now()
      };
      
      await updateDoc(docRef, {
        attachments: [...attachments, newAttachment],
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(
    detailsId: string,
    attachmentId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, detailsId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session details not found');
      }
      
      const currentData = docSnap.data();
      const attachments = currentData.attachments || [];
      
      const filteredAttachments = attachments.filter(
        (att: Attachment) => att.id !== attachmentId
      );
      
      await updateDoc(docRef, {
        attachments: filteredAttachments,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }

  /**
   * Get session details by student
   */
  async getByStudentId(studentId: string): Promise<SessionDetails[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('student_id', '==', studentId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      } as SessionDetails));
    } catch (error) {
      console.error('Error getting session details by student:', error);
      throw error;
    }
  }
}

export const sessionDetailsService = new SessionDetailsService();