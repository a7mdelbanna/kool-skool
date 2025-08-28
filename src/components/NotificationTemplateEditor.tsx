import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Eye, 
  Save, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  X,
  HelpCircle,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import {
  NotificationTemplate,
  NotificationTemplateType,
  NOTIFICATION_VARIABLES,
  NotificationVariable
} from '@/types/notification.types';
import { notificationSettingsService } from '@/services/notificationSettings.service';

interface NotificationTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationTemplate | null;
  schoolId: string;
  onSave: (template: NotificationTemplate) => void;
  onDelete?: (templateId: string) => void;
  mode: 'create' | 'edit';
}

const NotificationTemplateEditor: React.FC<NotificationTemplateEditorProps> = ({
  open,
  onOpenChange,
  template,
  schoolId,
  onSave,
  onDelete,
  mode
}) => {
  const [formData, setFormData] = useState<Omit<NotificationTemplate, 'id'>>({
    name: '',
    type: NotificationTemplateType.CUSTOM,
    language: 'en',
    body: '',
    variables: [],
    isDefault: false,
    isActive: true,
    schoolId
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isValid: true, errors: [], warnings: [] });
  const [isSaving, setIsSaving] = useState(false);

  // Load template data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        language: template.language,
        body: template.body,
        variables: template.variables,
        isDefault: template.isDefault,
        isActive: template.isActive,
        schoolId: template.schoolId || schoolId
      });
    } else {
      // Reset for new template
      setFormData({
        name: '',
        type: NotificationTemplateType.CUSTOM,
        language: 'en',
        body: '',
        variables: [],
        isDefault: false,
        isActive: true,
        schoolId
      });
    }
  }, [template, schoolId]);

  // Validate template whenever form data changes
  useEffect(() => {
    if (formData.body || formData.name) {
      const validation = notificationSettingsService.validateTemplate({
        ...formData,
        id: template?.id
      });
      setValidation(validation);
    }
  }, [formData, template?.id]);

  const handleSave = async () => {
    if (!validation.isValid) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const templateToSave: NotificationTemplate = {
        ...formData,
        id: template?.id,
        createdAt: template?.createdAt || new Date(),
        updatedAt: new Date()
      };

      const savedId = await notificationSettingsService.saveTemplate(templateToSave);
      
      onSave({
        ...templateToSave,
        id: savedId
      });

      toast.success(`Template ${mode === 'create' ? 'created' : 'updated'} successfully`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} template`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template?.id) return;

    if (template.isDefault) {
      toast.error('Default templates cannot be deleted');
      return;
    }

    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await notificationSettingsService.deleteTemplate(template.id);
        onDelete?.(template.id);
        toast.success('Template deleted successfully');
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('Failed to delete template');
      }
    }
  };

  const insertVariable = (variable: NotificationVariable) => {
    const variableTag = `{${variable.key}}`;
    const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = formData.body.substring(0, start) + variableTag + formData.body.substring(end);
      
      setFormData({ ...formData, body: newBody });
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableTag.length, start + variableTag.length);
      }, 0);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getPreview = () => {
    return notificationSettingsService.previewTemplate({
      ...formData,
      id: template?.id
    });
  };

  const templateTypeOptions = Object.values(NotificationTemplateType).map(type => ({
    value: type,
    label: notificationSettingsService.getTemplateTypeDisplayName(type)
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create' : 'Edit'} Notification Template
            {template?.isDefault && (
              <Badge variant="outline" className="ml-2">Default Template</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter template name..."
                      className={validation.errors.some(e => e.includes('name')) ? 'border-red-500' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-type">Template Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: NotificationTemplateType) => 
                        setFormData({ ...formData, type: value })
                      }
                      disabled={template?.isDefault}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-language">Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value: 'en' | 'ru') => 
                      setFormData({ ...formData, language: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Template Body */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Message Template</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-body">Message Body</Label>
                  <Textarea
                    id="template-body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Enter your message template..."
                    rows={6}
                    className={validation.errors.some(e => e.includes('body')) ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables like {'{studentName}'} to personalize messages. Click variables on the right to insert them.
                  </p>
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Preview with sample data:</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{getPreview()}</p>
                  </div>
                )}

                {/* Validation Messages */}
                {validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Errors:</span>
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Warnings:</span>
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-yellow-600 mt-0.5">•</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Variables Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Available Variables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Click a variable to insert it into your message template:
                  </p>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {NOTIFICATION_VARIABLES.map((variable) => (
                      <div 
                        key={variable.key} 
                        className="border rounded-md p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => insertVariable(variable)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {'{' + variable.key + '}'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(`{${variable.key}}`);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => insertVariable(variable)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {variable.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Example: {variable.example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Template is valid</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{validation.errors.length} error(s)</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {mode === 'edit' && template && !template.isDefault && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!validation.isValid || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Update Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationTemplateEditor;