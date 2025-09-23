import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, X, Globe, Phone, Mail } from 'lucide-react';
import { teachersService, Teacher } from '@/services/firebase/teachers.service';
import { authService } from '@/services/firebase/auth.service';
import CountryCodeSelector from '@/components/CountryCodeSelector';

interface AddTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddTeacherDialog: React.FC<AddTeacherDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+1',
    bio: '',
    experience: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    zoomLink: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      countryCode: '+1',
      bio: '',
      experience: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      zoomLink: '',
      password: '',
      confirmPassword: ''
    });
    setLanguages(['English']);
    setSubjects([]);
    setNewLanguage('');
    setNewSubject('');
    setErrors({});
    setCreateAccount(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (createAccount) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get school ID from localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('User data not found');
      }
      const user = JSON.parse(userData);
      const schoolId = user.schoolId;

      if (!schoolId) {
        throw new Error('School ID not found');
      }

      // Check if email already exists
      const emailExists = await teachersService.emailExists(formData.email, schoolId);
      if (emailExists) {
        toast.error('A teacher with this email already exists');
        setErrors({ email: 'This email is already in use' });
        return;
      }

      let userId = '';

      // Create Firebase Auth account if requested
      if (createAccount) {
        try {
          const authResult = await authService.createTeacher({
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            schoolId: schoolId
          });
          userId = authResult.uid;
          console.log('Teacher auth account created:', userId);
        } catch (authError: any) {
          console.error('Error creating auth account:', authError);
          if (authError.code === 'auth/email-already-in-use') {
            toast.error('An account with this email already exists');
            setErrors({ email: 'This email is already registered' });
          } else {
            toast.error('Failed to create authentication account');
          }
          return;
        }
      }

      // Create teacher record in database
      const teacherData: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        countryCode: formData.countryCode || undefined,
        schoolId: schoolId,
        bio: formData.bio || undefined,
        experience: formData.experience || undefined,
        timezone: formData.timezone,
        zoomLink: formData.zoomLink || undefined,
        languages: languages,
        subjects: subjects,
        isActive: true,
        role: 'teacher'
      };

      const teacherId = await teachersService.create(teacherData);
      console.log('Teacher created with ID:', teacherId);

      toast.success('Teacher added successfully!');
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      toast.error(error.message || 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setLanguages(languages.filter(l => l !== lang));
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject('');
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetForm();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Contact Information</h3>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="flex gap-2">
                <CountryCodeSelector
                  value={formData.countryCode}
                  onSelect={(code) => setFormData({ ...formData, countryCode: code })}
                />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Professional Information</h3>

            {/* Subjects */}
            <div>
              <Label>Subjects</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSubject}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <Badge key={subject} variant="secondary">
                    {subject}
                    <button
                      onClick={() => removeSubject(subject)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <Label>Languages</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a language"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLanguage}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <Badge key={lang} variant="secondary">
                    {lang}
                    <button
                      onClick={() => removeLanguage(lang)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief introduction about the teacher"
                rows={3}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Settings</h3>
            <div>
              <Label htmlFor="zoomLink">Zoom Link</Label>
              <Input
                id="zoomLink"
                type="url"
                value={formData.zoomLink}
                onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          </div>

          {/* Account Creation */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="createAccount">Create login account</Label>
              <Switch
                id="createAccount"
                checked={createAccount}
                onCheckedChange={setCreateAccount}
              />
            </div>

            {createAccount && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Add Teacher'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeacherDialog;