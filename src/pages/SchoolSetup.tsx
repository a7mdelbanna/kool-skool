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
  Upload,
  Book,
  BookOpen,
  DollarSign,
  CreditCard,
  Plus,
  Trash2,
  Repeat,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LicenseWidget from "@/components/LicenseWidget";

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

const SchoolSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [userSchoolInfo, setUserSchoolInfo] = useState<UserSchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [openSections, setOpenSections] = useState({
    schoolInfo: true,
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
        
        const { data, error } = await supabase.rpc('get_user_school_info');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const userInfo = data[0];
          setUserSchoolInfo(userInfo);
          
          setSchoolInfo({
            name: userInfo.school_name || '',
            picture: '',
            phone: '',
            telegram: '',
            whatsapp: '',
            instagram: ''
          });
          
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
              name: schoolData.name || '',
              picture: schoolData.logo || '',
              phone: schoolData.phone || '',
              telegram: schoolData.telegram || '',
              whatsapp: schoolData.whatsapp || '',
              instagram: schoolData.instagram || ''
            });
          }
          
          // Just log team data but don't try to set it to a teachers state
          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select('*')
            .eq('school_id', userInfo.school_id);
          
          if (teamError) throw teamError;
          
          if (teamData && teamData.length > 0) {
            console.log("Team members data:", teamData);
            // Remove reference to setTeachers
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
  
  const handleImageUpload = async (type: 'school') => {
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
              const { error } = await supabase
                .from('schools')
                .update({ logo: base64String })
                .eq('id', userSchoolInfo.school_id);
              
              if (error) throw error;
              
              toast({
                title: "Logo uploaded",
                description: "School logo has been updated successfully.",
              });
            }
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
      
      const { error: schoolError } = await supabase
        .from('schools')
        .update({
          name: schoolInfo.name,
          logo: schoolInfo.picture,
          phone: schoolInfo.phone,
          telegram: schoolInfo.telegram,
          whatsapp: schoolInfo.whatsapp,
          instagram: schoolInfo.instagram,
          updated_at: new Date().toISOString()
        })
        .eq('id', userSchoolInfo.school_id);
      
      if (schoolError) throw schoolError;
      
      toast({
        title: "School settings saved",
        description: "All your changes have been saved successfully.",
      });
      
      const { data, error } = await supabase.rpc('get_user_school_info');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
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
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Level
              </Button>
            </div>
            
            <Separator />
            
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
                    placeholder="Course name (e.g., Grammar, Conversation, IELTS)" 
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
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Course
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
                <h2 className="text-lg font-medium">Income & Expenses</h2>
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
                    placeholder="Category name (e.g., Rent, Utilities, Supplies)" 
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
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Recurring Expenses</h3>
              </div>
              
              {recurringExpenses.map(expense => (
                <div key={expense.id} className="grid md:grid-cols-4 gap-3 items-center">
                  <Input 
                    value={expense.name}
                    onChange={(e) => handleRecurringExpenseChange(expense.id, 'name', e.target.value)}
                    placeholder="Expense name" 
                    className="md:col-span-1"
                  />
                  
                  <select 
                    value={expense.categoryId}
                    onChange={(e) => handleRecurringExpenseChange(expense.id, 'categoryId', e.target.value)}
                    className="rounded-md border h-10 px-3 py-2 bg-background text-sm"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name || `Category ${category.id}`}
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex gap-2 md:col-span-1">
                    <select 
                      value={expense.frequency}
                      onChange={(e) => handleRecurringExpenseChange(
                        expense.id, 
                        'frequency', 
                        e.target.value as RecurringExpense['frequency']
                      )}
                      className="rounded-md border h-10 px-3 py-2 bg-background text-sm flex-1"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    
                    <Input 
                      type="number"
                      min="0"
                      value={expense.amount > 0 ? expense.amount : ''}
                      onChange={(e) => handleRecurringExpenseChange(
                        expense.id, 
                        'amount',
                        parseFloat(e.target.value) || 0
                      )}
                      placeholder="Amount" 
                      className="w-24"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveRecurringExpense(expense.id)}
                      disabled={recurringExpenses.length <= 1}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddRecurringExpense}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Recurring Expense
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Accounts</h3>
              </div>
              
              {accounts.map(account => (
                <div key={account.id} className="flex items-center gap-3">
                  <Input 
                    value={account.name}
                    onChange={(e) => handleAccountChange(account.id, 'name', e.target.value)}
                    placeholder="Account name (e.g., PayPal, Bank Account)" 
                    className="flex-1"
                  />
                  
                  <Input 
                    value={account.currency}
                    onChange={(e) => handleAccountChange(account.id, 'currency', e.target.value)}
                    placeholder="Currency (USD, EUR, etc.)" 
                    className="w-32"
                  />
                  
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
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="pt-4 flex justify-end">
          <Button type="submit" className="px-8" disabled={saving}>
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Changes</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SchoolSetup;
