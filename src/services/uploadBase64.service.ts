import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

class UploadBase64Service {
  /**
   * Convert file to base64 and store in Firestore (temporary workaround)
   * This is a workaround for Firebase Storage permission issues
   */
  async uploadPaymentMethodLogoAsBase64(
    file: File,
    schoolId: string,
    paymentMethodId: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          
          // Store the base64 string directly in the payment method document
          // This is not ideal for large images but works as a temporary solution
          if (paymentMethodId) {
            const docRef = doc(db, 'paymentMethods', paymentMethodId);
            await updateDoc(docRef, {
              icon: base64String,
              iconType: 'base64'
            });
          }
          
          resolve(base64String);
        } catch (error) {
          console.error('Error storing base64 image:', error);
          reject(new Error('Failed to store image'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image before converting to base64
   */
  async compressImage(file: File, maxWidth: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

export const uploadBase64Service = new UploadBase64Service();