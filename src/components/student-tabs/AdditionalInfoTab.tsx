import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Plus, 
  X, 
  Calendar as CalendarIcon, 
  Link2, 
  User,
  Heart,
  Hash,
  ExternalLink,
  MessageCircle,
  Send,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Student, SocialLink as StudentSocialLink } from "../StudentCard";

interface SocialLink extends StudentSocialLink {
  // icon is only for UI display, not stored in database
}

interface AdditionalInfoTabProps {
  studentData: Partial<Student>;
  setStudentData: (data: Partial<Student>) => void;
  isViewMode: boolean;
}

const socialPlatforms = [
  { 
    value: "whatsapp", 
    label: "WhatsApp", 
    icon: <MessageCircle className="h-4 w-4" />,
    placeholder: "Phone number (e.g., 1234567890)",
    inputType: "tel",
    formatLink: (input: string) => {
      // Remove all non-digit characters
      const phone = input.replace(/\D/g, '');
      return `https://wa.me/${phone}`;
    }
  },
  { 
    value: "telegram", 
    label: "Telegram", 
    icon: <Send className="h-4 w-4" />,
    placeholder: "Username (without @)",
    inputType: "text",
    formatLink: (input: string) => {
      // Remove @ if user includes it
      const username = input.replace('@', '');
      return `https://t.me/${username}`;
    }
  },
  { 
    value: "youtube", 
    label: "YouTube", 
    icon: <Youtube className="h-4 w-4" />,
    placeholder: "Channel URL or @username",
    inputType: "text",
    formatLink: (input: string) => {
      // Handle @username format
      if (input.startsWith('@')) {
        return `https://youtube.com/${input}`;
      }
      // If already a URL, return as-is
      if (input.includes('youtube.com') || input.includes('youtu.be')) {
        return input.startsWith('http') ? input : `https://${input}`;
      }
      // Otherwise treat as channel name
      return `https://youtube.com/c/${input}`;
    }
  },
  { 
    value: "instagram", 
    label: "Instagram", 
    icon: <Instagram className="h-4 w-4" />,
    placeholder: "Username (without @)",
    inputType: "text",
    formatLink: (input: string) => {
      const username = input.replace('@', '');
      return `https://instagram.com/${username}`;
    }
  },
  { 
    value: "facebook", 
    label: "Facebook", 
    icon: <Facebook className="h-4 w-4" />,
    placeholder: "Profile URL or username",
    inputType: "text",
    formatLink: (input: string) => {
      // If already a URL, return as-is
      if (input.includes('facebook.com') || input.includes('fb.com')) {
        return input.startsWith('http') ? input : `https://${input}`;
      }
      // Otherwise treat as username
      return `https://facebook.com/${input}`;
    }
  },
  { 
    value: "twitter", 
    label: "Twitter", 
    icon: <Twitter className="h-4 w-4" />,
    placeholder: "Username (without @)",
    inputType: "text",
    formatLink: (input: string) => {
      const username = input.replace('@', '');
      return `https://twitter.com/${username}`;
    }
  },
  { 
    value: "linkedin", 
    label: "LinkedIn", 
    icon: <Linkedin className="h-4 w-4" />,
    placeholder: "Profile URL or username",
    inputType: "text",
    formatLink: (input: string) => {
      // If already a URL, return as-is
      if (input.includes('linkedin.com')) {
        return input.startsWith('http') ? input : `https://${input}`;
      }
      // Otherwise treat as username/profile
      return `https://linkedin.com/in/${input}`;
    }
  },
  { 
    value: "other", 
    label: "Other", 
    icon: <Globe className="h-4 w-4" />,
    placeholder: "Full URL",
    inputType: "url",
    formatLink: (input: string) => {
      return input.startsWith('http') ? input : `https://${input}`;
    }
  }
];

const AdditionalInfoTab: React.FC<AdditionalInfoTabProps> = ({
  studentData,
  setStudentData,
  isViewMode
}) => {
  // Initialize social links with WhatsApp if student has a phone number
  const initializeSocialLinks = () => {
    const existingLinks = (studentData.socialLinks || []).map(link => ({
      id: link.id,
      platform: link.platform,
      url: link.url
      // Remove any icon field that might have been saved
    }));
    
    // Check if WhatsApp link already exists
    const hasWhatsApp = existingLinks.some(link => link.platform === 'whatsapp');
    
    // If student has phone but no WhatsApp link, add it
    if (studentData.phone && !hasWhatsApp) {
      const phoneNumber = studentData.phone.replace(/\D/g, ''); // Remove non-digits
      const whatsappLink: SocialLink = {
        id: 'whatsapp-auto',
        platform: 'whatsapp',
        url: `https://wa.me/${phoneNumber}`
      };
      return [whatsappLink, ...existingLinks];
    }
    
    return existingLinks;
  };
  
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    initializeSocialLinks()
  );
  const [interests, setInterests] = useState<string[]>(
    studentData.interests || []
  );
  const [newInterest, setNewInterest] = useState("");
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  
  // Update WhatsApp link when phone number changes
  React.useEffect(() => {
    if (studentData.phone) {
      const phoneNumber = studentData.phone.replace(/\D/g, '');
      const existingWhatsAppIndex = socialLinks.findIndex(link => link.platform === 'whatsapp');
      
      if (existingWhatsAppIndex >= 0) {
        // Update existing WhatsApp link if phone changed
        const currentUrl = socialLinks[existingWhatsAppIndex].url;
        const newUrl = `https://wa.me/${phoneNumber}`;
        
        if (currentUrl !== newUrl) {
          const updatedLinks = [...socialLinks];
          updatedLinks[existingWhatsAppIndex] = {
            ...updatedLinks[existingWhatsAppIndex],
            url: newUrl
          };
          setSocialLinks(updatedLinks);
          setStudentData({ ...studentData, socialLinks: updatedLinks });
        }
      } else if (phoneNumber && socialLinks.length > 0) {
        // Add WhatsApp link if phone exists but no WhatsApp link
        const whatsappPlatform = socialPlatforms.find(p => p.value === 'whatsapp');
        const whatsappLink: SocialLink = {
          id: 'whatsapp-auto',
          platform: 'whatsapp',
          url: `https://wa.me/${phoneNumber}`
        };
        const updatedLinks = [whatsappLink, ...socialLinks];
        setSocialLinks(updatedLinks);
        setStudentData({ ...studentData, socialLinks: updatedLinks });
      }
    }
  }, [studentData.phone]);

  const handleAddSocialLink = () => {
    if (newSocialPlatform && newSocialUrl) {
      const platform = socialPlatforms.find(p => p.value === newSocialPlatform);
      
      // Format the URL based on platform type
      const formattedUrl = platform?.formatLink ? platform.formatLink(newSocialUrl) : newSocialUrl;
      
      const newLink: SocialLink = {
        id: Date.now().toString(),
        platform: newSocialPlatform,
        url: formattedUrl
      };
      
      const updatedLinks = [...socialLinks, newLink];
      setSocialLinks(updatedLinks);
      setStudentData({ ...studentData, socialLinks: updatedLinks });
      setNewSocialPlatform("");
      setNewSocialUrl("");
    }
  };

  const handleRemoveSocialLink = (id: string) => {
    const updatedLinks = socialLinks.filter(link => link.id !== id);
    setSocialLinks(updatedLinks);
    setStudentData({ ...studentData, socialLinks: updatedLinks });
  };

  const handleOpenSocialLink = (url: string) => {
    // URL should already be properly formatted
    window.open(url, '_blank');
  };

  const handleAddInterest = () => {
    if (newInterest && !interests.includes(newInterest)) {
      const updatedInterests = [...interests, newInterest];
      setInterests(updatedInterests);
      setStudentData({ ...studentData, interests: updatedInterests });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    const updatedInterests = interests.filter(i => i !== interest);
    setInterests(updatedInterests);
    setStudentData({ ...studentData, interests: updatedInterests });
  };

  const handleInputChange = (field: string, value: any) => {
    setStudentData({ ...studentData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Social Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Social Links */}
          {socialLinks.length > 0 && (
            <div className="space-y-2 mb-4">
              {socialLinks.map((link) => {
                const platform = socialPlatforms.find(p => p.value === link.platform);
                return (
                  <div key={link.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      {platform?.icon}
                      <span className="font-medium">{platform?.label || link.platform}</span>
                      <span className="text-muted-foreground text-sm truncate flex-1">
                        {(() => {
                          // Display user-friendly version of the link
                          const url = link.url;
                          if (link.platform === 'whatsapp' && url.includes('wa.me/')) {
                            return url.replace('https://wa.me/', '+');
                          }
                          if (link.platform === 'telegram' && url.includes('t.me/')) {
                            return '@' + url.replace('https://t.me/', '');
                          }
                          if (link.platform === 'instagram' && url.includes('instagram.com/')) {
                            return '@' + url.replace('https://instagram.com/', '');
                          }
                          if (link.platform === 'twitter' && url.includes('twitter.com/')) {
                            return '@' + url.replace('https://twitter.com/', '');
                          }
                          // For others, show the URL without https://
                          return url.replace(/^https?:\/\//, '');
                        })()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenSocialLink(link.url)}
                      disabled={isViewMode}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {!isViewMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSocialLink(link.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Social Link */}
          {!isViewMode && (
            <div className="flex gap-2">
              <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {socialPlatforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      <div className="flex items-center gap-2">
                        {platform.icon}
                        {platform.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type={socialPlatforms.find(p => p.value === newSocialPlatform)?.inputType || "text"}
                placeholder={socialPlatforms.find(p => p.value === newSocialPlatform)?.placeholder || "Enter link or username"}
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
                onFocus={() => {
                  // Auto-fill with phone number when WhatsApp is selected and field is empty
                  if (newSocialPlatform === 'whatsapp' && !newSocialUrl && studentData.phone) {
                    setNewSocialUrl(studentData.phone.replace(/\D/g, ''));
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddSocialLink} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !studentData.birthday && "text-muted-foreground"
                  )}
                  disabled={isViewMode}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {studentData.birthday ? 
                    format(new Date(studentData.birthday), "PPP") : 
                    "Select birthday"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Select
                      value={studentData.birthday ? new Date(studentData.birthday).getMonth().toString() : ""}
                      onValueChange={(value) => {
                        const currentDate = studentData.birthday ? new Date(studentData.birthday) : new Date();
                        const newDate = new Date(currentDate);
                        newDate.setMonth(parseInt(value));
                        // Preserve the year when changing month
                        if (studentData.birthday) {
                          const existingYear = new Date(studentData.birthday).getFullYear();
                          newDate.setFullYear(existingYear);
                        }
                        handleInputChange("birthday", newDate.toISOString());
                      }}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">January</SelectItem>
                        <SelectItem value="1">February</SelectItem>
                        <SelectItem value="2">March</SelectItem>
                        <SelectItem value="3">April</SelectItem>
                        <SelectItem value="4">May</SelectItem>
                        <SelectItem value="5">June</SelectItem>
                        <SelectItem value="6">July</SelectItem>
                        <SelectItem value="7">August</SelectItem>
                        <SelectItem value="8">September</SelectItem>
                        <SelectItem value="9">October</SelectItem>
                        <SelectItem value="10">November</SelectItem>
                        <SelectItem value="11">December</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={studentData.birthday ? new Date(studentData.birthday).getFullYear().toString() : ""}
                      onValueChange={(value) => {
                        const currentDate = studentData.birthday ? new Date(studentData.birthday) : new Date();
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(parseInt(value));
                        // Preserve the month and day when changing year
                        if (studentData.birthday) {
                          const existingMonth = new Date(studentData.birthday).getMonth();
                          const existingDay = new Date(studentData.birthday).getDate();
                          newDate.setMonth(existingMonth);
                          newDate.setDate(existingDay);
                        }
                        handleInputChange("birthday", newDate.toISOString());
                      }}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Generate years from current year down to 100 years ago */}
                        {Array.from({ length: 100 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Calendar
                  mode="single"
                  selected={studentData.birthday ? new Date(studentData.birthday) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      // Preserve the year and month from the dropdowns
                      const selectedYear = studentData.birthday ? new Date(studentData.birthday).getFullYear() : date.getFullYear();
                      const selectedMonth = studentData.birthday ? new Date(studentData.birthday).getMonth() : date.getMonth();
                      
                      // Create a new date with the selected day but preserve year and month
                      const newDate = new Date(date);
                      newDate.setFullYear(selectedYear);
                      newDate.setMonth(selectedMonth);
                      
                      handleInputChange("birthday", newDate.toISOString());
                    } else {
                      handleInputChange("birthday", undefined);
                    }
                  }}
                  initialFocus
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  captionLayout="dropdown"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center hidden",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Teacher Preference</Label>
            <RadioGroup
              value={studentData.teacherPreference || "any"}
              onValueChange={(value) => handleInputChange("teacherPreference", value)}
              disabled={isViewMode}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="native" id="native" />
                <Label htmlFor="native">Native English Speaker</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="russian" id="russian" />
                <Label htmlFor="russian">Russian Teacher</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="any" />
                <Label htmlFor="any">No Preference</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Additional Preferences & Notes</Label>
            <Textarea
              id="preferences"
              placeholder="Any special requirements, learning style preferences, or other notes..."
              value={studentData.additionalNotes || ""}
              onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
              disabled={isViewMode}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Interests & Hobbies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add student interests to help teachers prepare relevant materials
          </p>
          
          {/* Interest Tags */}
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge key={interest} variant="secondary" className="px-3 py-1">
                {interest}
                {!isViewMode && (
                  <button
                    onClick={() => handleRemoveInterest(interest)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>

          {/* Add Interest */}
          {!isViewMode && (
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Minecraft, Roblox, YouTube, Sports..."
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                className="flex-1"
              />
              <Button onClick={handleAddInterest} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdditionalInfoTab;