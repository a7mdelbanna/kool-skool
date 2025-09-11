import { storage, db } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface SchoolLogoUploadResult {
  url: string;
  timestamp: string;
}

class SchoolLogoService {
  private readonly LOGO_SIZES = {
    full: { width: 500, height: 500 },
    thumbnail: { width: 100, height: 100 },
    icon: { width: 50, height: 50 }
  };

  /**
   * Compress and resize image before upload
   */
  private async processImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Use better image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to process image'));
            }
          },
          'image/png',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate image file
   */
  private validateImage(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Please upload a valid image file (JPG, PNG, or SVG)' 
      };
    }

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: 'Image size must be less than 5MB' 
      };
    }

    return { valid: true };
  }

  /**
   * Upload school logo
   */
  async uploadLogo(schoolId: string, file: File): Promise<SchoolLogoUploadResult | null> {
    try {
      // Validate image
      const validation = this.validateImage(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return null;
      }

      // Delete existing logo if present
      await this.deleteLogo(schoolId);

      const timestamp = Date.now();
      const uploads: Promise<string>[] = [];

      // Process and upload different sizes
      for (const [sizeName, dimensions] of Object.entries(this.LOGO_SIZES)) {
        const processedImage = await this.processImage(
          file,
          dimensions.width,
          dimensions.height
        );

        const fileName = `schools/${schoolId}/logo_${sizeName}_${timestamp}.png`;
        const storageRef = ref(storage, fileName);
        
        uploads.push(
          uploadBytes(storageRef, processedImage).then(() => 
            getDownloadURL(storageRef)
          )
        );
      }

      const urls = await Promise.all(uploads);

      // Update school document with logo URLs
      const schoolRef = doc(db, 'schools', schoolId);
      await updateDoc(schoolRef, {
        logo: urls[0], // Full size
        logoThumbnail: urls[1], // Thumbnail
        logoIcon: urls[2], // Icon
        logoUpdatedAt: new Date().toISOString()
      });

      toast.success('School logo uploaded successfully');

      return {
        url: urls[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading school logo:', error);
      toast.error('Failed to upload logo');
      return null;
    }
  }

  /**
   * Get school logo URL
   */
  async getLogoUrl(schoolId: string, size: 'full' | 'thumbnail' | 'icon' = 'full'): Promise<string | null> {
    try {
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolDoc = await getDoc(schoolRef);
      
      if (!schoolDoc.exists()) {
        return null;
      }

      const data = schoolDoc.data();
      
      switch (size) {
        case 'thumbnail':
          return data.logoThumbnail || data.logo || null;
        case 'icon':
          return data.logoIcon || data.logoThumbnail || data.logo || null;
        default:
          return data.logo || null;
      }
    } catch (error) {
      console.error('Error getting school logo:', error);
      return null;
    }
  }

  /**
   * Delete school logo
   */
  async deleteLogo(schoolId: string): Promise<boolean> {
    try {
      // Get current logo URLs
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolDoc = await getDoc(schoolRef);
      
      if (!schoolDoc.exists()) {
        return false;
      }

      const data = schoolDoc.data();
      
      // Delete all logo sizes from storage
      const deletePromises: Promise<void>[] = [];
      
      if (data.logo) {
        try {
          const fullRef = ref(storage, data.logo);
          deletePromises.push(deleteObject(fullRef));
        } catch (error) {
          console.log('Logo file may not exist:', error);
        }
      }
      
      if (data.logoThumbnail) {
        try {
          const thumbRef = ref(storage, data.logoThumbnail);
          deletePromises.push(deleteObject(thumbRef));
        } catch (error) {
          console.log('Thumbnail file may not exist:', error);
        }
      }
      
      if (data.logoIcon) {
        try {
          const iconRef = ref(storage, data.logoIcon);
          deletePromises.push(deleteObject(iconRef));
        } catch (error) {
          console.log('Icon file may not exist:', error);
        }
      }

      await Promise.allSettled(deletePromises);

      // Clear logo fields in Firestore
      await updateDoc(schoolRef, {
        logo: null,
        logoThumbnail: null,
        logoIcon: null,
        logoUpdatedAt: null
      });

      return true;
    } catch (error) {
      console.error('Error deleting school logo:', error);
      return false;
    }
  }

  /**
   * Update school branding
   */
  async updateSchoolBranding(schoolId: string, branding: {
    name?: string;
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
  }): Promise<boolean> {
    try {
      const schoolRef = doc(db, 'schools', schoolId);
      await updateDoc(schoolRef, {
        ...branding,
        brandingUpdatedAt: new Date().toISOString()
      });
      
      toast.success('School branding updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating school branding:', error);
      toast.error('Failed to update branding');
      return false;
    }
  }
}

export const schoolLogoService = new SchoolLogoService();