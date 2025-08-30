import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Image, 
  File, 
  Upload, 
  Download, 
  Trash2,
  Loader2,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  sessionDetailsService, 
  Attachment 
} from '@/services/firebase/sessionDetails.service';
import { storageService } from '@/services/firebase/storage.service';

interface SessionAttachmentsProps {
  sessionId: string;
  detailsId?: string;
  attachments: Attachment[];
  onAttachmentsUpdate: (attachments: Attachment[]) => void;
}

const SessionAttachments: React.FC<SessionAttachmentsProps> = ({
  sessionId,
  detailsId,
  attachments,
  onAttachmentsUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Firebase Storage
      const path = `sessions/${sessionId}/attachments/${Date.now()}_${file.name}`;
      const url = await storageService.uploadFile(file, path);
      
      const newAttachment: Attachment = {
        id: Date.now().toString(),
        name: file.name,
        url: url,
        type: file.type,
        size: file.size,
        uploaded_at: new Date()
      };

      const updatedAttachments = [...attachments, newAttachment];
      onAttachmentsUpdate(updatedAttachments);
      
      // Save to Firebase if detailsId exists
      if (detailsId) {
        await sessionDetailsService.addAttachment(detailsId, {
          name: newAttachment.name,
          url: newAttachment.url,
          type: newAttachment.type,
          size: newAttachment.size
        });
      }
      
      toast.success('File uploaded successfully');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (attachment) {
        // Delete from Firebase Storage
        await storageService.deleteFile(attachment.url);
      }
      
      const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
      onAttachmentsUpdate(updatedAttachments);
      
      // Delete from Firebase if detailsId exists
      if (detailsId) {
        await sessionDetailsService.deleteAttachment(detailsId, attachmentId);
      }
      
      toast.success('Attachment deleted');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      // Open in new tab for download
      window.open(attachment.url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (type.includes('doc')) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Attachments</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </div>
      </div>

      {attachments.length === 0 ? (
        <Card className="p-8 text-center">
          <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No attachments yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload files, documents, or images related to this session
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {attachments.map(attachment => (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(attachment.type)}
                  <div className="flex-1">
                    <p className="font-medium truncate">{attachment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(attachment.size)} • Uploaded {' '}
                      {format(new Date(attachment.uploaded_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>Supported file types: Images, PDF, Word, Excel, PowerPoint, Text files</p>
        <p>Maximum file size: 10MB</p>
      </div>
    </div>
  );
};

export default SessionAttachments;