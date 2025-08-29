import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  User,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { auth, db, getUserClaims } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  schoolId?: string;
  avatar?: string;
  timezone?: string;
  phoneNumber?: string;
  isActive: boolean;
  metadata?: {
    lastLogin: any;
    loginCount: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  schoolId: string;
  phoneNumber?: string;
  timezone?: string;
}

export interface StudentData {
  birthday?: Date;
  ageGroup?: 'child' | 'teen' | 'adult';
  level?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  parentName?: string;
  parentEmail?: string;
  teacherId?: string;
  courseId?: string;
  courseName?: string;
  lessonType?: 'individual' | 'group';
}

class AuthService {
  // Current user state management
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private userClaims: any = null;

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.loadUserProfile(user.uid);
        this.userClaims = await getUserClaims();
      } else {
        this.userProfile = null;
        this.userClaims = null;
      }
    });
  }

  // Load user profile from Firestore
  private async loadUserProfile(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        this.userProfile = { uid, ...userDoc.data() } as UserProfile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  // Sign up new user (for initial setup or student self-registration)
  async signUp(
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string,
    role: 'admin' | 'teacher' | 'student' = 'student',
    schoolId?: string
  ): Promise<User> {
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // Create user profile in Firestore
      const userProfile: Omit<UserProfile, 'uid'> = {
        email,
        firstName,
        lastName,
        role: role as UserProfile['role'],
        schoolId: schoolId || '',
        isActive: true,
        metadata: {
          lastLogin: serverTimestamp(),
          loginCount: 1
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Verify the document was created
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (!docSnap.exists()) {
        throw new Error('Failed to create user document in Firestore');
      }

      return user;
    } catch (error: any) {
      console.error('Error in signUp:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Sign in existing user
  async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const profile = userDoc.data() as UserProfile;

      // Check if user is active
      if (!profile.isActive) {
        await signOut(auth);
        throw new Error('Your account has been deactivated. Please contact your administrator.');
      }

      // Update last login
      await updateDoc(doc(db, 'users', user.uid), {
        'metadata.lastLogin': serverTimestamp(),
        'metadata.loginCount': (profile.metadata?.loginCount || 0) + 1
      });

      // Get custom claims for role and schoolId
      const idTokenResult = await user.getIdTokenResult();
      const claims = idTokenResult.claims;

      // Return enriched profile
      return {
        ...profile,
        uid: user.uid,
        role: claims.role as any || profile.role,
        schoolId: claims.schoolId as string || profile.schoolId
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Sign out current user
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
      this.userClaims = null;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Update display name if name changed
      if (updates.firstName || updates.lastName) {
        const user = auth.currentUser;
        if (user && user.uid === uid) {
          const profile = await this.getUserProfile(uid);
          await updateProfile(user, {
            displayName: `${profile.firstName} ${profile.lastName}`
          });
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  // Get user profile by ID
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      return { uid, ...userDoc.data() } as UserProfile;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get user profile');
    }
  }

  // Create new user (Admin/Teacher creating students)
  async createUser(userData: CreateUserData): Promise<string> {
    try {
      // For now, create user directly without cloud function due to CORS issues
      // This is a temporary workaround until cloud functions are properly configured
      
      // Generate a unique ID for the user
      const uid = doc(collection(db, 'users')).id;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        schoolId: userData.schoolId,
        phoneNumber: userData.phoneNumber || null,
        timezone: userData.timezone || 'UTC',
        isActive: true,
        metadata: {
          lastLogin: null,
          loginCount: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return uid;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create user');
    }
  }

  // Create student with extended profile
  async createStudent(
    userData: CreateUserData,
    studentData: StudentData
  ): Promise<string> {
    
    try {
      let uid: string;
      
      // For now, always create students without Firebase Auth to avoid logout issues
      // Students can be given auth accounts later when they need to log in
      
      // Generate a unique ID for the student
      uid = doc(collection(db, 'users')).id;
      
      // Create user document in Firestore
      const userDocument: any = {
        uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'student',
        schoolId: userData.schoolId,
        timezone: userData.timezone || 'UTC',
        isActive: true,
        needsAuthAccount: true,
        metadata: {
          lastLogin: null,
          loginCount: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Only add optional fields if they have values
      if (userData.phoneNumber) {
        userDocument.phoneNumber = userData.phoneNumber;
      }
      
      if (userData.password) {
        userDocument.tempPassword = userData.password;
      }
      
      await setDoc(doc(db, 'users', uid), userDocument);

      // Create student profile
      // Clean the studentData to remove undefined values
      const cleanStudentData: any = {};
      Object.keys(studentData).forEach(key => {
        const value = (studentData as any)[key];
        if (value !== undefined && value !== null) {
          cleanStudentData[key] = value;
        }
      });
      
      const studentDocument = {
        id: uid,
        userId: uid,
        schoolId: userData.schoolId,
        ...cleanStudentData,
        // Add normalized fields for UI display
        courseName: cleanStudentData.courseName || '',
        lessonType: cleanStudentData.lessonType || 'individual',
        ageGroup: cleanStudentData.ageGroup || 'Adult',
        level: cleanStudentData.level || 'Beginner',
        enrollmentDate: serverTimestamp(),
        totalLessonsTaken: 0,
        totalLessonsScheduled: 0,
        status: 'active',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'students', uid), studentDocument);

      return uid;
    } catch (error: any) {
      console.error('Error creating student:', error);
      throw new Error(error.message || 'Failed to create student');
    }
  }

  // Update user email
  async updateUserEmail(newEmail: string, currentPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update email
      await updateEmail(user, newEmail);

      // Update in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        email: newEmail,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update email');
    }
  }

  // Update user password
  async updateUserPassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update password');
    }
  }

  // Check if user has specific role
  async hasRole(role: string): Promise<boolean> {
    if (!this.userClaims) return false;
    
    const userRole = this.userClaims.role;
    const roleHierarchy: { [key: string]: number } = {
      'superadmin': 4,
      'admin': 3,
      'teacher': 2,
      'student': 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[role] || 0;

    return userLevel >= requiredLevel;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current user profile
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  // Get current user claims
  getCurrentUserClaims(): any {
    return this.userClaims;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // Deactivate user (Admin only)
  async deactivateUser(uid: string): Promise<void> {
    try {
      const deactivateFunction = httpsCallable(functions, 'deactivateUser');
      await deactivateFunction({ uid });

      // Update Firestore
      await updateDoc(doc(db, 'users', uid), {
        isActive: false,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to deactivate user');
    }
  }

  // Create Firebase Auth account for existing student (Admin only)
  async createAuthAccountForStudent(studentId: string): Promise<void> {
    try {
      // Get student document
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      if (!studentDoc.exists()) {
        throw new Error('Student not found');
      }

      const studentData = studentDoc.data();
      if (!studentData.needsAuthAccount) {
        throw new Error('Student already has an auth account');
      }

      // Use cloud function to create auth account if available
      // For now, we'll just mark that the account needs to be created manually
      
      // Update the document to mark auth account as created
      await updateDoc(doc(db, 'users', studentId), {
        needsAuthAccount: false,
        tempPassword: null, // Clear the temporary password
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create auth account for student');
    }
  }

  // Reactivate user (Admin only)
  async reactivateUser(uid: string): Promise<void> {
    try {
      const reactivateFunction = httpsCallable(functions, 'reactivateUser');
      await reactivateFunction({ uid });

      // Update Firestore
      await updateDoc(doc(db, 'users', uid), {
        isActive: true,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reactivate user');
    }
  }

  // Update user role (SuperAdmin only)
  async updateUserRole(uid: string, newRole: string, schoolId?: string): Promise<void> {
    try {
      const updateRoleFunction = httpsCallable(functions, 'setUserClaims');
      await updateRoleFunction({ 
        userId: uid, 
        role: newRole, 
        schoolId 
      });

      // Update Firestore
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        schoolId,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update user role');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;