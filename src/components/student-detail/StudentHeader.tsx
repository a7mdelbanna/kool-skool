import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Users, 
  Trophy,
  Zap,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface StudentHeaderProps {
  student: any;
  stats: {
    totalSessions: number;
    totalWords: number;
    completedTodos: number;
    totalTodos: number;
    currentStreak: number;
    masteryRate: number;
  };
}

const StudentHeader: React.FC<StudentHeaderProps> = ({ student, stats }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getAgeGroupColor = (ageGroup: string) => {
    return ageGroup === 'Adult' || ageGroup === 'adult' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800';
  };

  const getLessonTypeColor = (type: string) => {
    return type === 'individual' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-orange-100 text-orange-800';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              {student.image ? (
                <AvatarImage src={student.image} alt={`${student.first_name} ${student.last_name}`} />
              ) : (
                <AvatarFallback className="text-2xl">
                  {getInitials(student.first_name, student.last_name)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">
                  {student.first_name} {student.last_name}
                </h2>
                <Badge className={getAgeGroupColor(student.age_group)}>
                  {student.age_group}
                </Badge>
                <Badge className={getLessonTypeColor(student.lesson_type)}>
                  {student.lesson_type}
                </Badge>
                {student.level && (
                  <Badge variant="outline">{student.level}</Badge>
                )}
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span>{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span>{student.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3 w-3" />
                  <span>{student.course_name || 'No course assigned'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-600 mb-1" />
              <span className="text-xs text-muted-foreground">Streak</span>
              <span className="font-bold">{stats.currentStreak} days</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
              <Zap className="h-6 w-6 text-blue-600 mb-1" />
              <span className="text-xs text-muted-foreground">XP Points</span>
              <span className="font-bold">0</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
              <Target className="h-6 w-6 text-green-600 mb-1" />
              <span className="text-xs text-muted-foreground">Completion</span>
              <span className="font-bold">
                {stats.totalTodos > 0 
                  ? Math.round((stats.completedTodos / stats.totalTodos) * 100) 
                  : 0}%
              </span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mb-1" />
              <span className="text-xs text-muted-foreground">Rank</span>
              <span className="font-bold">#1</span>
            </div>
          </div>
        </div>

        {/* Parent Info (if kid) */}
        {student.age_group === 'Kid' && student.parent_info && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Parent/Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name: </span>
                <span>{student.parent_info.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Relationship: </span>
                <span className="capitalize">{student.parent_info.relationship}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contact: </span>
                <span>{student.parent_info.phone}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentHeader;