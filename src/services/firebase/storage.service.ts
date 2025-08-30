import { storage, auth } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

class StorageService {
  /**
   * Upload a file to Firebase Storage
   * @param file - The file to upload
   * @param path - The storage path for the file
   * @returns The download URL of the uploaded file
   */
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to upload files');
      }

      // Create a storage reference
      const storageRef = ref(storage, path);
      
      // Add metadata to help with permissions
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          uploadedAt: new Date().toISOString()
        }
      };
      
      // Upload the file with metadata
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        throw new Error('You do not have permission to upload files. Please contact your administrator.');
      } else if (error.code === 'storage/unauthenticated') {
        throw new Error('You must be logged in to upload files.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was cancelled.');
      } else if (error.code === 'storage/unknown') {
        throw new Error('An unknown error occurred. Please try again.');
      }
      
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  /**
   * Delete a file from Firebase Storage
   * @param path - The storage path of the file to delete
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw error if file doesn't exist
      if ((error as any).code !== 'storage/object-not-found') {
        throw new Error('Failed to delete file');
      }
    }
  }

  /**
   * Get a file URL from a storage path
   * @param path - The storage path
   * @returns The download URL
   */
  async getFileURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error('Failed to get file URL');
    }
  }
}

export const storageService = new StorageService();