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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SocialLink {
  platform: string;
  url: string;
}

export interface TeacherAvailability {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  schoolId: string;

  // Profile Information
  bio?: string;
  profilePicture?: string;
  bannerImage?: string;
  socialLinks?: SocialLink[];

  // Professional Information
  subjects?: string[];
  experience?: string;
  qualifications?: string[];
  languages?: string[];

  // Settings
  timezone?: string;
  zoomLink?: string;
  availability?: TeacherAvailability[];

  // Status
  isActive: boolean;
  role: 'teacher';

  // Timestamps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;

  // Statistics (computed, not stored)
  studentCount?: number;
  activeSubscriptions?: number;
  completedLessons?: number;
}

class TeachersService {
  private collectionName = 'users';  // Teachers are stored in users collection with role='teacher'

  // Create a new teacher
  async create(teacherData: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const teacherRef = doc(collection(db, this.collectionName));
      const teacherId = teacherRef.id;

      const teacher = {
        ...teacherData,
        id: teacherId,
        role: 'teacher' as const,
        isActive: teacherData.isActive ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(teacherRef, teacher);
      console.log('Teacher created successfully:', teacherId);
      return teacherId;
    } catch (error) {
      console.error('Error creating teacher:', error);
      throw error;
    }
  }

  // Get all teachers for a school
  async getBySchoolId(schoolId: string): Promise<Teacher[]> {
    try {
      // First fetch all users from the school
      const q = query(
        collection(db, this.collectionName),
        where('schoolId', '==', schoolId)
      );

      const snapshot = await getDocs(q);

      // Then filter for teachers in memory to avoid compound index requirement
      const teachers = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id
        } as any))
        .filter(user => user.role === 'teacher')
        .map(teacher => ({
          ...teacher,
          // Map fields from users collection to Teacher interface
          firstName: teacher.firstName || teacher.first_name || '',
          lastName: teacher.lastName || teacher.last_name || '',
          isActive: teacher.isActive !== false // Default to true if not set
        } as Teacher));

      return teachers;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  }

  // Get active teachers for a school (for dropdowns)
  async getActiveTeachers(schoolId: string): Promise<Teacher[]> {
    try {
      // First fetch all users from the school
      const q = query(
        collection(db, this.collectionName),
        where('schoolId', '==', schoolId)
      );

      const snapshot = await getDocs(q);

      // Filter for active teachers in memory
      const teachers = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id
        } as any))
        .filter(user => user.role === 'teacher' && user.isActive !== false)
        .map(teacher => ({
          ...teacher,
          // Map fields from users collection to Teacher interface
          firstName: teacher.firstName || teacher.first_name || '',
          lastName: teacher.lastName || teacher.last_name || '',
          isActive: true
        } as Teacher))
        .sort((a, b) => {
          const nameA = a.firstName.toLowerCase();
          const nameB = b.firstName.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      return teachers;
    } catch (error) {
      console.error('Error fetching active teachers:', error);
      throw error;
    }
  }

  // Get a single teacher by ID
  async getById(teacherId: string): Promise<Teacher | null> {
    try {
      const teacherRef = doc(db, this.collectionName, teacherId);
      const teacherSnap = await getDoc(teacherRef);

      if (teacherSnap.exists()) {
        return {
          ...teacherSnap.data(),
          id: teacherSnap.id
        } as Teacher;
      }

      return null;
    } catch (error) {
      console.error('Error fetching teacher:', error);
      throw error;
    }
  }

  // Update teacher information
  async update(teacherId: string, updates: Partial<Teacher>): Promise<void> {
    try {
      const teacherRef = doc(db, this.collectionName, teacherId);

      // Remove id from updates if present
      const { id, ...updateData } = updates;

      await updateDoc(teacherRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      console.log('Teacher updated successfully:', teacherId);
    } catch (error) {
      console.error('Error updating teacher:', error);
      throw error;
    }
  }

  // Update teacher profile (for teachers updating their own profile)
  async updateProfile(teacherId: string, profileData: {
    bio?: string;
    profilePicture?: string;
    bannerImage?: string;
    socialLinks?: SocialLink[];
    timezone?: string;
    zoomLink?: string;
    availability?: TeacherAvailability[];
  }): Promise<void> {
    try {
      const teacherRef = doc(db, this.collectionName, teacherId);

      await updateDoc(teacherRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });

      console.log('Teacher profile updated successfully:', teacherId);
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      throw error;
    }
  }

  // Delete teacher (soft delete by setting isActive to false)
  async delete(teacherId: string): Promise<void> {
    try {
      const teacherRef = doc(db, this.collectionName, teacherId);

      await updateDoc(teacherRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });

      console.log('Teacher deactivated successfully:', teacherId);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      throw error;
    }
  }

  // Hard delete teacher (use with caution)
  async hardDelete(teacherId: string): Promise<void> {
    try {
      const teacherRef = doc(db, this.collectionName, teacherId);
      await deleteDoc(teacherRef);

      console.log('Teacher permanently deleted:', teacherId);
    } catch (error) {
      console.error('Error permanently deleting teacher:', error);
      throw error;
    }
  }

  // Get teacher statistics
  async getTeacherStats(teacherId: string): Promise<{
    studentCount: number;
    activeSubscriptions: number;
    completedLessons: number;
  }> {
    try {
      // Get active subscriptions for this teacher
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'active')
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const activeSubscriptions = subscriptionsSnapshot.size;

      // Get unique students
      const studentIds = new Set<string>();
      subscriptionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.studentId) {
          studentIds.add(data.studentId);
        }
      });

      // Get completed lessons count
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'completed')
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const completedLessons = sessionsSnapshot.size;

      return {
        studentCount: studentIds.size,
        activeSubscriptions,
        completedLessons
      };
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      return {
        studentCount: 0,
        activeSubscriptions: 0,
        completedLessons: 0
      };
    }
  }

  // Search teachers by name
  async searchByName(schoolId: string, searchTerm: string): Promise<Teacher[]> {
    try {
      const allTeachers = await this.getBySchoolId(schoolId);

      const searchLower = searchTerm.toLowerCase();
      return allTeachers.filter(teacher =>
        teacher.firstName.toLowerCase().includes(searchLower) ||
        teacher.lastName.toLowerCase().includes(searchLower) ||
        `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching teachers:', error);
      throw error;
    }
  }

  // Check if email exists for school
  async emailExists(email: string, schoolId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('email', '==', email),
        where('schoolId', '==', schoolId)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }
}

export const teachersService = new TeachersService();