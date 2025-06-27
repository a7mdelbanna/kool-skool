
import { useQuery } from "@tanstack/react-query";
import { getSchoolTeachers } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export const useTeachers = (schoolId: string | null, enabled: boolean = true) => {
  console.log('=== useTeachers HOOK START ===');
  console.log('useTeachers - schoolId:', schoolId);
  console.log('useTeachers - schoolId type:', typeof schoolId);
  console.log('useTeachers - enabled:', enabled);
  console.log('useTeachers - query will be enabled:', !!schoolId && enabled);
  
  const { data: teachers, isLoading, error, refetch } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async (): Promise<Teacher[]> => {
      console.log('=== useTeachers QUERY FUNCTION START ===');
      console.log('Fetching teachers for schoolId:', schoolId);
      console.log('SchoolId in query function type:', typeof schoolId);
      
      if (!schoolId) {
        console.warn('No schoolId provided to useTeachers query function');
        return [];
      }
      
      try {
        console.log('Calling getSchoolTeachers with:', schoolId);
        const result = await getSchoolTeachers(schoolId);
        console.log('useTeachers - Raw result from getSchoolTeachers:', result);
        console.log('useTeachers - Result type:', typeof result);
        console.log('useTeachers - Is result array?:', Array.isArray(result));
        
        if (!result || !Array.isArray(result)) {
          console.warn('useTeachers - Invalid result format:', result);
          return [];
        }
        
        const mappedTeachers = result.map(teacher => ({
          id: teacher.id,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          display_name: teacher.display_name || `${teacher.first_name} ${teacher.last_name}`
        }));
        
        console.log('useTeachers - Mapped teachers:', mappedTeachers);
        console.log('useTeachers - Teachers count:', mappedTeachers.length);
        console.log('useTeachers - Each teacher:', mappedTeachers.forEach ? mappedTeachers.map((t, i) => `${i+1}: ${t.display_name} (${t.id})`) : 'Not iterable');
        
        return mappedTeachers;
      } catch (error) {
        console.error('useTeachers - Error fetching teachers:', error);
        console.error('useTeachers - Error type:', typeof error);
        console.error('useTeachers - Error details:', error);
        throw error;
      } finally {
        console.log('=== useTeachers QUERY FUNCTION END ===');
      }
    },
    enabled: !!schoolId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });
  
  console.log('=== useTeachers HOOK RESULT ===');
  console.log('useTeachers - teachers:', teachers);
  console.log('useTeachers - teachers type:', typeof teachers);
  console.log('useTeachers - teachers is array?:', Array.isArray(teachers));
  console.log('useTeachers - teachers length:', teachers?.length);
  console.log('useTeachers - isLoading:', isLoading);
  console.log('useTeachers - error:', error);
  console.log('useTeachers - error details:', error ? { message: error.message, name: error.name } : 'No error');
  console.log('=== useTeachers HOOK END ===');
  
  return {
    teachers: teachers || [],
    isLoading,
    error,
    refetch
  };
};
