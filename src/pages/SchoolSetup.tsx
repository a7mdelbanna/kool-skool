import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, 
  ChevronUp, 
  School, 
  Phone, 
  Instagram, 
  MessageSquare, 
  Users,
  Upload,
  Book,
  BookOpen,
  DollarSign,
  CreditCard,
  Plus,
  Trash2,
  Repeat,
  GraduationCap,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Mail
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase, inviteTeamMember } from "@/integrations/supabase/client";
import LicenseWidget from "@/components/LicenseWidget";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SchoolInfo {
  name: string;
  picture: string;
  phone: string;
  telegram: string;
  whatsapp: string;
  instagram: string;
}

interface Teacher {
  id: string;
  name: string;
  picture: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  email: string;
  role: string;
}

interface Level {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

interface RecurringExpense {
  id: string;
  name: string;
  categoryId: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  amount: number;
}

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface UserSchoolInfo {
  user_id: string;
  school_id: string;
  license_id: string;
  role: string;
  school_name: string;
  license_number: string;
  license_is_active: boolean;
  license_days_remaining: number;
  license_expires_at: string;
}

interface TeamMemberData {
  id: string;
  email: string;
  role: "director" | "teacher" | "admin" | "staff";
  profile_id: string | null;
  invitation_accepted: boolean | null;
  invitation_sent: boolean | null;
  invited_by: string | null;
  school_id: string;
  created_at: string;
  updated_at: string;
}

const safeAccess = <T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined => {
  return obj && key in obj ? obj[key] : undefined;
};

const SchoolSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [userSchoolInfo, setUserSchoolInfo] = useState<UserSchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invitingTeamMember, setInvitingTeamMember] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [openSections, setOpenSections] = useState({
    schoolInfo: true,
    teachers: false,
    lessons: false,
    finance: false
  });
  
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: '',
    picture: '',
    phone: '',
    telegram: '',
    whatsapp: '',
    instagram: ''
  });
  
  const [teachers, setTeachers] = useState<Teacher[]>([
    { id: '1', name: '', picture: '', whatsapp: '', telegram: '', instagram: '', email: '', role: 'teacher' }
  ]);
  
  const [levels, setLevels] = useState<Level[]>([
    { id: '1', name: '' }
  ]);
  
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', name: '' }
  ]);
  
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([
    { id: '1', name: '' }
  ]);
  
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([
    { id: '1', name: '', categoryId: '', frequency: 'monthly', amount: 0 }
  ]);
  
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: '', currency: '' }
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      try {
        setLoading(true);
        
        // Get user's school info
        const { data, error } = await supabase.rpc('get_user_school_info');
        
        if (error) throw error;
        
        if (data && Array.isArray(data) && data.length > 0) {
          const userInfo = data[0];
          setUserSchoolInfo(userInfo);
          
          // Prefill school information
          setSchoolInfo({
            name: userInfo.school_name || '',
            picture: '',
            phone: '',
            telegram: '',
            whatsapp: '',
            instagram: ''
          });
          
          // Get school details
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('*')
            .eq('id', userInfo.school_id)
            .single();
          
          if (schoolError && schoolError.code !== 'PGRST116') {
            throw schoolError;
          }
          
          if (schoolData) {
            setSchoolInfo({
              name: safeAccess(schoolData, 'name') || '',
              picture: safeAccess(schoolData, 'logo') || '',
              phone: safeAccess(schoolData, 'phone') || '',
              telegram: safeAccess(schoolData, 'telegram') || '',
              whatsapp: safeAccess(schoolData, 'whatsapp') || '',
              instagram: safeAccess(schoolData, 'instagram') || ''
            });
          }
          
          // Get team members
          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select('*')
            .eq('school_id', userInfo.school_id);
          
          if (teamError) throw teamError;
          
          if (teamData && teamData.length > 0) {
            const formattedTeachers = teamData.map((member: any) => ({
              id: safeAccess(member, 'id') || Date.now().toString(),
              name: safeAccess(member, 'email') ? safeAccess(member, 'email').split('@')[0] : '',
              picture: '',
              whatsapp: '',
              telegram: '',
              instagram: '',
              email: safeAccess(member, 'email') || '',
              role: safeAccess(member, 'role') || 'teacher'
            }));
            
            if (formattedTeachers.length > 0) {
              setTeachers(formattedTeachers);
            }
          }
        } else {
          navigate('/license-verification');
        }
      } catch (error) {
        console.error('Error loading school data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load school information',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, toast]);
  
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleSchoolInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchoolInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddTeacher = () => {
    setTeachers(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', picture: '', whatsapp: '', telegram: '', instagram: '', email: '', role: 'teacher' }
    ]);
  };
  
  const handleTeacherChange = (id: string, field: keyof Teacher, value: string) => {
    setTeachers(prev => 
      prev.map(teacher => 
        teacher.id === id ? { ...teacher, [field]: value } : teacher
      )
    );
    
    if (errors[`${id}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_${field}`];
        return newErrors;
      });
    }
  };
  
  const handleRemoveTeacher = (id: string) => {
    setTeachers(prev => prev.filter(teacher => teacher.id !== id));
  };
  
  const validateTeamMember = (teacher: Teacher) => {
    const newErrors: Record<string, string> = {};
    
    if (!teacher.name) {
      newErrors[`${teacher.id}_name`] = 'Name is required';
    }
    
    if (!teacher.email) {
      newErrors[`${teacher.id}_email`] = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(teacher.email)) {
      newErrors[`${teacher.id}_email`] = 'Invalid email format';
    }
    
    if (!teacher.role) {
      newErrors[`${teacher.id}_role`] = 'Role is required';
    }
    
    return newErrors;
  };
  
  const handleInviteTeamMember = async (teacher: Teacher) => {
    const validationErrors = validateTeamMember(teacher);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...validationErrors }));
      return;
    }
    
    try {
      setInvitingTeamMember(prev => ({ ...prev, [teacher.id]: true }));
      
      const nameParts = teacher.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      console.log("Inviting team member with data:", {
        email: teacher.email,
        role: teacher.role,
        firstName,
        lastName
      });
      
      const result = await inviteTeamMember({
        email: teacher.email,
        role: teacher.role as "director" | "teacher" | "admin" | "staff",
        firstName,
        lastName
      });
      
      console.log("Team member invitation result:", result);
      
      toast({
        title: 'Team member invited',
        description: `An invitation has been sent to ${teacher.email}`,
      });
      
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite team member',
        variant: 'destructive'
      });
    } finally {
      setInvitingTeamMember(prev => ({ ...prev, [teacher.id]: false }));
    }
  };
  
  const handleAddLevel = () => {
    setLevels(prev => [
      ...prev,
      { id: Date.now().toString(), name: '' }
    ]);
  };
  
  const handleLevelChange = (id: string, value: string) => {
    setLevels(prev => 
      prev.map(level => 
        level.id === id ? { ...level, name: value } : level
      )
    );
  };
  
  const handleRemoveLevel = (id: string) => {
    setLevels(prev => prev.filter(level => level.id !== id));
  };
  
  const handleAddCourse = () => {
    setCourses(prev => [
      ...prev,
      { id: Date.now().toString(), name: '' }
    ]);
  };
  
  const handleCourseChange = (id: string, value: string) => {
    setCourses(prev => 
      prev.map(course => 
        course.id === id ? { ...course, name: value } : course
      )
    );
  };
  
  const handleRemoveCourse = (id: string) => {
    setCourses(prev => prev.filter(course => course.id !== id));
  };
  
  const handleAddExpenseCategory = () => {
    setExpenseCategories(prev => [
      ...prev,
      { id: Date.now().toString(), name: '' }
    ]);
  };
  
  const handleExpenseCategoryChange = (id: string, value: string) => {
    setExpenseCategories(prev => 
      prev.map(category => 
        category.id === id ? { ...category, name: value } : category
      )
    );
  };
  
  const handleRemoveExpenseCategory = (id: string) => {
    setExpenseCategories(prev => prev.filter(category => category.id !== id));
  };
  
  const handleAddRecurringExpense = () => {
    setRecurringExpenses(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', categoryId: '', frequency: 'monthly', amount: 0 }
    ]);
  };
  
  const handleRecurringExpenseChange = (id: string, field: keyof RecurringExpense, value: any) => {
    setRecurringExpenses(prev => 
      prev.map(expense => 
        expense.id === id ? { ...expense, [field]: value } : expense
      )
    );
  };
  
  const handleRemoveRecurringExpense = (id: string) => {
    setRecurringExpenses(prev => prev.filter(expense => expense.id !== id));
  };
  
  const handleAddAccount = () => {
    setAccounts(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', currency: '' }
    ]);
  };
  
  const handleAccountChange = (id: string, field: keyof Account, value: string) => {
    setAccounts(prev => 
      prev.map(account => 
        account.id === id ? { ...account, [field]: value } : account
      )
    );
  };
  
  const handleRemoveAccount = (id: string) => {
    setAccounts(prev => prev.filter(account => account.id !== id));
  };
  
  const handleImageUpload = async (type: 'school' | 'teacher', teacherId?: string) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64String = event.target?.result as string;
          
          if (type === 'school') {
            setSchoolInfo(prev => ({
              ...prev,
              picture: base64String
            }));
            
            if (userSchoolInfo) {
              const updateData = { logo: base64String } as any;
              const { error } = await supabase
                .from('schools')
                .update(updateData)
                .eq('id', userSchoolInfo.school_id as any);
              
              if (error) throw error;
              
              toast({
                title: "Logo uploaded",
                description: "School logo has been updated successfully.",
              });
            }
          } else if (type === 'teacher' && teacherId) {
            setTeachers(prev => 
              prev.map(teacher => 
                teacher.id === teacherId 
                  ? { ...teacher, picture: base64String } 
                  : teacher
              )
            );
            
            toast({
              title: "Image uploaded",
              description: "Teacher profile picture has been uploaded successfully.",
            });
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Upload failed',
          description: 'Failed to upload the image',
          variant: 'destructive'
        });
      }
    };
    
    fileInput.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userSchoolInfo) {
      toast({
        title: 'Error',
        description: 'No school information found',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSaving(true);
      
      const updateData = {
        name: schoolInfo.name,
        logo: schoolInfo.picture,
        phone: schoolInfo.phone,
        telegram: schoolInfo.telegram,
        whatsapp: schoolInfo.whatsapp,
        instagram: schoolInfo.instagram,
        updated_at: new Date().toISOString()
      } as any;
      
      const { error: schoolError } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', userSchoolInfo.school_id as any);
      
      if (schoolError) throw schoolError;
      
      toast({
        title: "School settings saved",
        description: "All your changes have been saved successfully.",
      });
      
      const { data, error } = await supabase.rpc('get_user_school_info');
      
      if (error) throw error;
      
      if (data && Array.isArray(data) && data.length > 0) {
        setUserSchoolInfo(data[0]);
      }
      
    } catch (error: any) {
      console.error('Error saving school settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save school settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading school information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <School className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">School Setup</h1>
      </div>
      
      <div className="mb-6">
        <LicenseWidget />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Collapsible 
          open={openSections.schoolInfo} 
          onOpenChange={() => toggleSection('schoolInfo')}
          className="border rounded-lg overflow-hidden"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium">School Information</h2>
              </div>
              {openSections.schoolInfo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input 
                  id="school-name" 
                  name="name" 
                  value={schoolInfo.name} 
                  onChange={handleSchoolInfoChange} 
                  placeholder="Enter school name" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="school-phone">Phone Number</Label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input 
                    id="school-phone" 
                    name="phone" 
                    value={schoolInfo.phone} 
                    onChange={handleSchoolInfoChange} 
                    placeholder="Enter phone number" 
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>School Logo</Label>
              <div className="flex items-center gap-4">
                {schoolInfo.picture ? (
                  <div className="relative h-24 w-24 rounded-md overflow-hidden border">
                    <img 
                      src={schoolInfo.picture} 
                      alt="School Logo" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                    <School className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => handleImageUpload('school')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-telegram">Telegram</Label>
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input 
                    id="school-telegram" 
                    name="telegram" 
                    value={schoolInfo.telegram} 
                    onChange={handleSchoolInfoChange} 
                    placeholder="@yourschool" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="school-whatsapp">WhatsApp</Label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input 
                    id="school-whatsapp" 
                    name="whatsapp" 
                    value={schoolInfo.whatsapp} 
                    onChange={handleSchoolInfoChange} 
                    placeholder="+1234567890" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="school-instagram">Instagram</Label>
                <div className="flex items-center">
                  <Instagram className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input 
                    id="school-instagram" 
                    name="instagram" 
                    value={schoolInfo.instagram} 
                    onChange={handleSchoolInfoChange} 
                    placeholder="@yourschool" 
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <Collapsible 
          open={openSections.teachers} 
          onOpenChange={() => toggleSection('teachers')}
          className="border rounded-lg overflow-hidden"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium">Team Members</h2>
              </div>
              {openSections.teachers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 space-y-4">
            {teachers.map((teacher, index) => (
              <div key={teacher.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Team Member {index + 1}</h3>
                  {teachers.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveTeacher(teacher.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`teacher-name-${teacher.id}`}>Name</Label>
                    <Input 
                      id={`teacher-name-${teacher.id}`}
                      value={teacher.name} 
                      onChange={(e) => handleTeacherChange(teacher.id, 'name', e.target.value)}
                      placeholder="Team member name" 
                      className={errors[`${teacher.id}_name`] ? 'border-destructive' : ''}
                    />
                    {errors[`${teacher.id}_name`] && (
                      <p className="text-sm text-destructive">{errors[`${teacher.id}_name`]}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`teacher-email-${teacher.id}`}>Email</Label>
                    <Input 
                      id={`teacher-email-${teacher.id}`}
                      type="email"
                      value={teacher.email}
                      onChange={(e) => handleTeacherChange(teacher.id, 'email', e.target.value)}
                      placeholder="team.member@example.com" 
                      className={errors[`${teacher.id}_email`] ? 'border-destructive' : ''}
                    />
                    {errors[`${teacher.id}_email`] && (
                      <p className="text-sm text-destructive">{errors[`${teacher.id}_email`]}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`teacher-role-${teacher.id}`}>Role</Label>
                  <select
                    id={`teacher-role-${teacher.id}`}
                    value={teacher.role}
                    onChange={(e) => handleTeacherChange(teacher.id, 'role', e.target.value)}
                    className={`w-full rounded-md border h-10 px-3 py-2 bg-background text-sm ${
                      errors[`${teacher.id}_role`] ? 'border-destructive' : ''
                    }`}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                  {errors[`${teacher.id}_role`] && (
                    <p className="text-sm text-destructive">{errors[`${teacher.id}_role`]}</p>
                  )}
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    type="button" 
                    onClick={() => handleInviteTeamMember(teacher)}
                    disabled={invitingTeamMember[teacher.id]}
                  >
                    {invitingTeamMember[teacher.id] ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                        <span>Sending Invitation...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Send Invitation</span>
                      </div>
                    )}
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`teacher-telegram-${teacher.id}`}>Telegram</Label>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                      <Input 
                        id={`teacher-telegram-${teacher.id}`}
                        value={teacher.telegram}
                        onChange={(e) => handleTeacherChange(teacher.id, 'telegram', e.target.value)}
                        placeholder="@username" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`teacher-whatsapp-${teacher.id}`}>WhatsApp</Label>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <Input 
                        id={`teacher-whatsapp-${teacher.id}`}
                        value={teacher.whatsapp}
                        onChange={(e) => handleTeacherChange(teacher.id, 'whatsapp', e.target.value)}
                        placeholder="+1234567890" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`teacher-instagram-${teacher.id}`}>Instagram</Label>
                    <div className="flex items-center">
                      <Instagram className="h-4 w-4 mr-2 text-muted-foreground" />
                      <Input 
                        id={`teacher-instagram-${teacher.id}`}
                        value={teacher.instagram}
                        onChange={(e) => handleTeacherChange(teacher.id, 'instagram', e.target.value)}
                        placeholder="@username" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddTeacher}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Team Member
            </Button>
          </CollapsibleContent>
        </Collapsible>
        
        <Collapsible 
          open={openSections.lessons} 
          onOpenChange={() => toggleSection('lessons')}
          className="border rounded-lg overflow-hidden"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium">Lessons</h2>
              </div>
              {openSections.lessons ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Levels</h3>
              </div>
              
              {levels.map(level => (
                <div key={level.id} className="flex items-center gap-2">
                  <Input 
                    value={level.name}
                    onChange={(e) => handleLevelChange(level.id, e.target.value)}
                    placeholder="Level name (e.g., Beginner, Intermediate, Advanced)" 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveLevel(level.id)}
                    disabled={levels.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddLevel}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Level
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Courses</h3>
              </div>
              
              {courses.map(course => (
                <div key={course.id} className="flex items-center gap-2">
                  <Input 
                    value={course.name}
                    onChange={(e) => handleCourseChange(course.id, e.target.value)}
                    placeholder="Course name (e.g., English, Math, Science)" 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveCourse(course.id)}
                    disabled={courses.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
              
              <Button
                type="button" 
                variant="outline" 
                onClick={handleAddCourse}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Course
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <Collapsible 
          open={openSections.finance} 
          onOpenChange={() => toggleSection('finance')}
          className="border rounded-lg overflow-hidden"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium">Finance</h2>
              </div>
              {openSections.finance ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Expense Categories</h3>
              </div>
              
              {expenseCategories.map(category => (
                <div key={category.id} className="flex items-center gap-2">
                  <Input 
                    value={category.name}
                    onChange={(e) => handleExpenseCategoryChange(category.id, e.target.value)}
                    placeholder="Category name (e.g., Rent, Utilities, Salaries)" 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveExpenseCategory(category.id)}
                    disabled={expenseCategories.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddExpenseCategory}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Category
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Recurring Expenses</h3>
              </div>
              
              {recurringExpenses.map(expense => (
                <div key={expense.id} className="border p-3 rounded-md space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`expense-name-${expense.id}`}>Name</Label>
                      <Input 
                        id={`expense-name-${expense.id}`}
                        value={expense.name}
                        onChange={(e) => handleRecurringExpenseChange(expense.id, 'name', e.target.value)}
                        placeholder="Expense name" 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`expense-category-${expense.id}`}>Category</Label>
                      <select
                        id={`expense-category-${expense.id}`}
                        value={expense.categoryId}
                        onChange={(e) => handleRecurringExpenseChange(expense.id, 'categoryId', e.target.value)}
                        className="w-full rounded-md border h-10 px-3 py-2 bg-background text-sm"
                      >
                        <option value="">Select category</option>
                        {expenseCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name || "Unnamed category"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`expense-frequency-${expense.id}`}>Frequency</Label>
                      <select
                        id={`expense-frequency-${expense.id}`}
                        value={expense.frequency}
                        onChange={(e) => handleRecurringExpenseChange(expense.id, 'frequency', e.target.value)}
                        className="w-full rounded-md border h-10 px-3 py-2 bg-background text-sm"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor={`expense-amount-${expense.id}`}>Amount</Label>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input 
                          id={`expense-amount-${expense.id}`}
                          type="number"
                          value={expense.amount || ''}
                          onChange={(e) => handleRecurringExpenseChange(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveRecurringExpense(expense.id)}
                      disabled={recurringExpenses.length <= 1}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddRecurringExpense}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Recurring Expense
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Accounts</h3>
              </div>
              
              {accounts.map(account => (
                <div key={account.id} className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <Input 
                      value={account.name}
                      onChange={(e) => handleAccountChange(account.id, 'name', e.target.value)}
                      placeholder="Account name (e.g., Cash, Bank)" 
                    />
                    <Input 
                      value={account.currency}
                      onChange={(e) => handleAccountChange(account.id, 'currency', e.target.value)}
                      placeholder="Currency (e.g., USD, EUR)" 
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveAccount(account.id)}
                    disabled={accounts.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddAccount}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Account
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Settings</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SchoolSetup;
