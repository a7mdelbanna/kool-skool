import { useContext, useEffect, useState } from 'react';
import { UserContext } from '@/App';
import { messageTemplatesService, MessageTemplate } from '@/services/messageTemplates.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  MessageSquare,
  Calendar,
  CreditCard,
  Copy,
  Sparkles
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function MessageTemplates() {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<MessageTemplate>>({
    name: '',
    type: 'custom',
    content: '',
    language: 'en',
    isActive: true,
    placeholders: []
  });

  useEffect(() => {
    if (user?.schoolId) {
      loadTemplates();
    }
  }, [user?.schoolId]);

  const loadTemplates = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      const fetchedTemplates = await messageTemplatesService.getTemplates(user.schoolId);
      setTemplates(fetchedTemplates);

      // Initialize default templates if none exist
      if (fetchedTemplates.length === 0) {
        await messageTemplatesService.initializeDefaultTemplates(user.schoolId);
        const newTemplates = await messageTemplatesService.getTemplates(user.schoolId);
        setTemplates(newTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load message templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      type: 'custom',
      content: '',
      language: 'en',
      isActive: true,
      placeholders: []
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      language: template.language,
      isActive: template.isActive,
      placeholders: template.placeholders
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.schoolId || !formData.name || !formData.content) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Extract placeholders from content
      const placeholders = messageTemplatesService.extractPlaceholders(formData.content);

      if (selectedTemplate?.id) {
        // Update existing template
        await messageTemplatesService.updateTemplate(selectedTemplate.id, {
          ...formData,
          placeholders
        } as Partial<MessageTemplate>);

        toast({
          title: 'Success',
          description: 'Template updated successfully'
        });
      } else {
        // Create new template
        await messageTemplatesService.createTemplate({
          ...formData,
          schoolId: user.schoolId,
          placeholders
        } as Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>);

        toast({
          title: 'Success',
          description: 'Template created successfully'
        });
      }

      setEditDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate?.id) return;

    try {
      await messageTemplatesService.deleteTemplate(selectedTemplate.id);
      toast({
        title: 'Success',
        description: 'Template deleted successfully'
      });
      setDeleteDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (template: MessageTemplate) => {
    try {
      await messageTemplatesService.toggleTemplateActive(
        template.id!,
        !template.isActive
      );
      toast({
        title: 'Success',
        description: `Template ${!template.isActive ? 'activated' : 'deactivated'}`
      });
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template status',
        variant: 'destructive'
      });
    }
  };

  const handlePreview = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const getPreviewData = (type: MessageTemplate['type']): Record<string, string> => {
    const baseData = {
      schoolName: 'Kool-Skool',
      studentName: 'John Doe'
    };

    switch (type) {
      case 'lesson_reminder':
        return {
          ...baseData,
          courseName: 'English Advanced',
          lessonDate: 'November 20, 2025',
          lessonTime: '10:00 AM',
          teacherName: 'Ms. Sarah Johnson'
        };
      case 'payment_reminder':
        return {
          ...baseData,
          amount: '$150.00',
          dueDate: 'November 25, 2025',
          description: 'Monthly tuition fee'
        };
      default:
        return baseData;
    }
  };

  const getTypeIcon = (type: MessageTemplate['type']) => {
    switch (type) {
      case 'welcome':
        return <Sparkles className="h-4 w-4" />;
      case 'lesson_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'payment_reminder':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: MessageTemplate['type']) => {
    switch (type) {
      case 'welcome':
        return 'Welcome';
      case 'lesson_reminder':
        return 'Lesson Reminder';
      case 'payment_reminder':
        return 'Payment Reminder';
      default:
        return 'Custom';
    }
  };

  if (!user?.schoolId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Please log in to manage message templates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage templates for Telegram notifications
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No templates yet</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(template.type)}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={() => handleToggleActive(template)}
                  />
                </div>
                <CardDescription className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{getTypeName(template.type)}</Badge>
                  <Badge variant="outline">{template.language.toUpperCase()}</Badge>
                  {template.isActive && (
                    <Badge className="bg-green-500">Active</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.content}
                    </p>
                  </div>

                  {template.placeholders.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Placeholders:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.placeholders.map(placeholder => (
                          <Badge key={placeholder} variant="secondary" className="text-xs">
                            {placeholder}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex-1"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? 'Update your message template'
                : 'Create a new message template for Telegram notifications'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Welcome Message (English)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as MessageTemplate['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="lesson_reminder">Lesson Reminder</SelectItem>
                    <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Language *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) =>
                    setFormData({ ...formData, language: value as 'en' | 'ru' | 'both' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="content">Message Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your message here. Use {placeholderName} for dynamic values."
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use curly braces for placeholders: {'{studentName}'}, {'{lessonTime}'}, etc.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            {/* Common Placeholders Guide */}
            <Card className="bg-muted/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Available Placeholders</CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Badge variant="secondary" className="mb-1">{'{studentName}'}</Badge>
                    <p className="text-muted-foreground">Student's name</p>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-1">{'{schoolName}'}</Badge>
                    <p className="text-muted-foreground">School name</p>
                  </div>
                  {formData.type === 'lesson_reminder' && (
                    <>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{courseName}'}</Badge>
                        <p className="text-muted-foreground">Course name</p>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{lessonDate}'}</Badge>
                        <p className="text-muted-foreground">Lesson date</p>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{lessonTime}'}</Badge>
                        <p className="text-muted-foreground">Lesson time</p>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{teacherName}'}</Badge>
                        <p className="text-muted-foreground">Teacher name</p>
                      </div>
                    </>
                  )}
                  {formData.type === 'payment_reminder' && (
                    <>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{amount}'}</Badge>
                        <p className="text-muted-foreground">Payment amount</p>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{dueDate}'}</Badge>
                        <p className="text-muted-foreground">Due date</p>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-1">{'{description}'}</Badge>
                        <p className="text-muted-foreground">Payment description</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {selectedTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Template Name</Label>
                    <p className="font-medium">{selectedTemplate.name}</p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Preview</Label>
                    <div className="mt-2 p-4 bg-background rounded-lg border whitespace-pre-wrap">
                      {messageTemplatesService.previewTemplate(
                        selectedTemplate,
                        getPreviewData(selectedTemplate.type)
                      )}
                    </div>
                  </div>

                  {selectedTemplate.placeholders.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Sample Data Used</Label>
                        <div className="mt-2 space-y-1">
                          {Object.entries(getPreviewData(selectedTemplate.type)).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{`{${key}}`}</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template "{selectedTemplate?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
