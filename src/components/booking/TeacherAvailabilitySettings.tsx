import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Clock, Save, Plus, Trash2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { teacherAvailabilityService, TeacherAvailability } from '@/services/firebase/teacherAvailability.service';
import { COMMON_TIMEZONES } from '@/utils/timezone';
import { UserContext } from '@/App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
  breaks: TimeSlot[];
}

interface Props {
  teacherId: string;
  isReadOnly?: boolean;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
] as const;

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: false,
  start: '09:00',
  end: '17:00',
  breaks: []
};

const TeacherAvailabilitySettings: React.FC<Props> = ({ teacherId, isReadOnly = false }) => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolTimezone, setSchoolTimezone] = useState('UTC');
  
  const [settings, setSettings] = useState<Partial<TeacherAvailability>>({
    working_hours: {
      monday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      tuesday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      wednesday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      thursday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      friday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      saturday: { ...DEFAULT_DAY_SCHEDULE },
      sunday: { ...DEFAULT_DAY_SCHEDULE }
    },
    timezone: 'UTC',
    buffer_time: 15,
    min_booking_notice: 24,
    max_booking_advance: 90
  });

  useEffect(() => {
    loadSettings();
    loadSchoolTimezone();
  }, [teacherId]);

  const loadSchoolTimezone = async () => {
    try {
      if (user?.schoolId) {
        const schoolDoc = await getDoc(doc(db, 'schools', user.schoolId));
        if (schoolDoc.exists()) {
          const schoolData = schoolDoc.data();
          const tz = schoolData.timezone || 'UTC';
          setSchoolTimezone(tz);
          
          // Set default timezone if not already set
          setSettings(prev => ({
            ...prev,
            timezone: prev.timezone || tz
          }));
        }
      }
    } catch (error) {
      console.error('Error loading school timezone:', error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const availability = await teacherAvailabilityService.getTeacherAvailability(teacherId);
      console.log('Loaded availability settings for teacher:', teacherId, availability);
      
      if (availability) {
        setSettings(availability);
      } else {
        console.log('No existing availability settings, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await teacherAvailabilityService.setWorkingHours(teacherId, {
        ...settings,
        teacher_id: teacherId,
        school_id: user?.schoolId || ''
      });
      
      toast.success('Availability settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = (day: string, updates: Partial<DaySchedule>) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours!,
        [day]: {
          ...prev.working_hours![day as keyof typeof prev.working_hours],
          ...updates
        }
      }
    }));
  };

  const addBreak = (day: string) => {
    const daySchedule = settings.working_hours![day as keyof typeof settings.working_hours];
    const newBreak: TimeSlot = { start: '12:00', end: '13:00' };
    
    updateDaySchedule(day, {
      breaks: [...(daySchedule.breaks || []), newBreak]
    });
  };

  const removeBreak = (day: string, index: number) => {
    const daySchedule = settings.working_hours![day as keyof typeof settings.working_hours];
    const breaks = [...(daySchedule.breaks || [])];
    breaks.splice(index, 1);
    
    updateDaySchedule(day, { breaks });
  };

  const updateBreak = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const daySchedule = settings.working_hours![day as keyof typeof settings.working_hours];
    const breaks = [...(daySchedule.breaks || [])];
    breaks[index] = { ...breaks[index], [field]: value };
    
    updateDaySchedule(day, { breaks });
  };

  const copyToWeekdays = () => {
    const mondaySchedule = settings.working_hours!.monday;
    const weekdays = ['tuesday', 'wednesday', 'thursday', 'friday'];
    
    weekdays.forEach(day => {
      updateDaySchedule(day, { ...mondaySchedule });
    });
    
    toast.success('Monday schedule copied to weekdays');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure booking rules and timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">
                <Globe className="inline h-4 w-4 mr-1" />
                Timezone
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                disabled={isReadOnly}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={schoolTimezone}>
                    School Default ({schoolTimezone})
                  </SelectItem>
                  <Separator className="my-2" />
                  {COMMON_TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer">Buffer Time (minutes)</Label>
              <Input
                id="buffer"
                type="number"
                min="0"
                max="60"
                value={settings.buffer_time}
                onChange={(e) => setSettings(prev => ({ ...prev, buffer_time: parseInt(e.target.value) }))}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice">Min Booking Notice (hours)</Label>
              <Input
                id="notice"
                type="number"
                min="0"
                max="168"
                value={settings.min_booking_notice}
                onChange={(e) => setSettings(prev => ({ ...prev, min_booking_notice: parseInt(e.target.value) }))}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance">Max Booking Advance (days)</Label>
              <Input
                id="advance"
                type="number"
                min="1"
                max="365"
                value={settings.max_booking_advance}
                onChange={(e) => setSettings(prev => ({ ...prev, max_booking_advance: parseInt(e.target.value) }))}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>
                Set your available hours for each day of the week
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyToWeekdays}
              >
                Copy Monday to Weekdays
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {DAYS.map(({ key, label }) => {
            const daySchedule = settings.working_hours![key];
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={daySchedule.enabled}
                      onCheckedChange={(checked) => updateDaySchedule(key, { enabled: checked })}
                      disabled={isReadOnly}
                    />
                    <Label className="font-medium">{label}</Label>
                  </div>
                  
                  {daySchedule.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={daySchedule.start}
                        onChange={(e) => updateDaySchedule(key, { start: e.target.value })}
                        className="w-32"
                        disabled={isReadOnly}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={daySchedule.end}
                        onChange={(e) => updateDaySchedule(key, { end: e.target.value })}
                        className="w-32"
                        disabled={isReadOnly}
                      />
                    </div>
                  )}
                </div>

                {/* Breaks */}
                {daySchedule.enabled && (
                  <div className="ml-10 space-y-2">
                    {daySchedule.breaks?.map((breakSlot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Break:</span>
                        <Input
                          type="time"
                          value={breakSlot.start}
                          onChange={(e) => updateBreak(key, index, 'start', e.target.value)}
                          className="w-32"
                          disabled={isReadOnly}
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={breakSlot.end}
                          onChange={(e) => updateBreak(key, index, 'end', e.target.value)}
                          className="w-32"
                          disabled={isReadOnly}
                        />
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBreak(key, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBreak(key)}
                        className="ml-16"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Break
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TeacherAvailabilitySettings;