import React, { useState, useEffect, useContext, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { schoolLogoService } from '@/services/firebase/schoolLogo.service';
import { UserContext } from '@/App';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SchoolLogoUpload: React.FC = () => {
  const { user } = useContext(UserContext);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load existing logo on mount
    if (user?.schoolId) {
      loadExistingLogo();
    }
  }, [user?.schoolId]);

  const loadExistingLogo = async () => {
    if (!user?.schoolId) return;
    
    try {
      const url = await schoolLogoService.getLogoUrl(user.schoolId);
      setLogoUrl(url);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!user?.schoolId) {
      toast.error('School ID not found');
      return;
    }

    setIsUploading(true);
    
    try {
      const result = await schoolLogoService.uploadLogo(user.schoolId, file);
      
      if (result) {
        setLogoUrl(result.url);
        toast.success('Logo uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user?.schoolId) return;
    
    setIsUploading(true);
    
    try {
      const success = await schoolLogoService.deleteLogo(user.schoolId);
      
      if (success) {
        setLogoUrl(null);
        toast.success('Logo removed successfully');
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      toast.error('Please drop an image file');
    }
  };

  return (
    <Card className="glass glass-hover">
      <CardHeader>
        <CardTitle>School Logo</CardTitle>
        <CardDescription>
          Upload your school's logo to display in the system and on student materials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Logo Image</Label>
          
          {/* Logo Preview */}
          {logoUrl && (
            <div className="mb-4">
              <div className="relative inline-block">
                <img
                  src={logoUrl}
                  alt="School Logo"
                  className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200 bg-white p-2"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-8 w-8"
                  onClick={handleRemoveLogo}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-gray-300",
              isUploading && "opacity-50 pointer-events-none"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading logo...</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your logo here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports JPG, PNG, SVG (max 5MB)
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Tips for best results:</strong>
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
              <li>• Use a square image (1:1 ratio) for best display</li>
              <li>• Transparent PNG files work well for logos</li>
              <li>• Minimum recommended size: 200x200 pixels</li>
              <li>• Logo will be automatically resized for different uses</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolLogoUpload;