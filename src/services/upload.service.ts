import { storage, auth } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class UploadService {
  /**
   * Upload payment method logo to Firebase Storage
   */
  async uploadPaymentMethodLogo(
    file: File,
    schoolId: string
  ): Promise<string> {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to upload files');
      }

      // Validate image file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `payment-logos/${schoolId}/${timestamp}.${fileExtension}`;

      // Create storage reference
      const storageRef = ref(storage, fileName);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          schoolId,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          uploadedBy: auth.currentUser.uid
        }
      });

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('Payment method logo uploaded successfully:', downloadUrl);
      return downloadUrl;
    } catch (error: any) {
      console.error('Error uploading payment method logo:', error);
      
      // Provide more specific error messages
      if (error?.code === 'storage/unauthorized') {
        throw new Error('Permission denied. Please check Firebase Storage rules or contact support.');
      } else if (error?.code === 'storage/unauthenticated') {
        throw new Error('You must be logged in to upload files.');
      } else if (error?.code === 'storage/quota-exceeded') {
        throw new Error('Storage quota exceeded. Please contact support.');
      }
      
      throw new Error(error?.message || 'Failed to upload logo. Please try again.');
    }
  }

  /**
   * Upload payment proof file to Firebase Storage
   */
  async uploadPaymentProof(
    file: File,
    schoolId: string,
    studentId: string
  ): Promise<string> {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `payment-proofs/${schoolId}/${studentId}/${timestamp}_${sanitizedFileName}`;

      // Create storage reference
      const storageRef = ref(storage, fileName);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          schoolId,
          studentId,
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      });

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('Payment proof uploaded successfully:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      throw new Error('Failed to upload payment proof. Please try again.');
    }
  }

  /**
   * Upload teacher document (for future use)
   */
  async uploadTeacherDocument(
    file: File,
    schoolId: string,
    teacherId: string,
    documentType: string
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `teacher-documents/${schoolId}/${teacherId}/${documentType}/${timestamp}_${sanitizedFileName}`;

      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          schoolId,
          teacherId,
          documentType,
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      });

      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading teacher document:', error);
      throw new Error('Failed to upload document. Please try again.');
    }
  }

  /**
   * Upload student avatar
   */
  async uploadAvatar(
    file: File,
    schoolId: string,
    userId: string,
    userType: 'student' | 'teacher' | 'parent'
  ): Promise<string> {
    try {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Limit file size to 2MB for avatars
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Avatar image must be less than 2MB');
      }

      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `avatars/${schoolId}/${userType}/${userId}/${timestamp}.${fileExtension}`;

      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          schoolId,
          userId,
          userType,
          uploadedAt: new Date().toISOString()
        }
      });

      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload avatar. Please try again.');
    }
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate file type against allowed types
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        // Handle wildcard types like 'image/*'
        const baseType = type.slice(0, -2);
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });
  }

  /**
   * Generate a thumbnail URL for images (uses Firebase's image transformation)
   */
  getThumbnailUrl(originalUrl: string, width: number = 200): string {
    // Firebase doesn't have built-in image transformation
    // This would need to be implemented with Cloud Functions
    // For now, return the original URL
    return originalUrl;
  }
}

export const uploadService = new UploadService();