import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '@/App';
import { dashboardService } from '@/services/dashboard.service';
import StudentCard, { Student } from '@/components/StudentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

const RecentStudents: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.schoolId) return;

      setLoading(true);
      try {
        const recentStudents = await dashboardService.getRecentStudents(user.schoolId, 4);

        // Convert to StudentCard format
        const formattedStudents: Student[] = recentStudents.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          courseName: s.courseName,
          lessonType: s.lessonType,
          ageGroup: s.ageGroup,
          level: s.level,
          lessonsCompleted: s.lessonsCompleted,
          nextLesson: s.nextLesson,
          paymentStatus: s.paymentStatus as any,
          nextPaymentDate: s.nextPaymentDate
        }));

        setStudents(formattedStudents);
      } catch (error) {
        console.error('Error fetching recent students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user?.schoolId]);

  return (
    <Card className="h-full glass-card backdrop-blur-xl border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Recent Students
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/students')}
            className="text-xs"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />
            ))
          ) : students.length > 0 ? (
            students.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
                onClick={() => navigate(`/student/${student.id}`)}
              />
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No students found.
              <Button
                variant="link"
                className="text-primary hover:text-primary/80 block mt-2"
                onClick={() => navigate('/students')}
              >
                Add your first student
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentStudents;