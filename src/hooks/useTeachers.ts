
import { useQuery } from "@tanstack/react-query";
import { getSchoolTeachers } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export const useTeachers = (schoolId: string | null, enabled: boolean = true) => {
  
  const { data: teachers, isLoading, error, refetch } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async (): Promise<Teacher[]> => {
      if (!schoolId) {
        return [];
      }
      
      try {
        const result = await getSchoolTeachers(schoolId);
        
        if (!result || !Array.isArray(result)) {
          return [];
        }
        
        const mappedTeachers = result.map(teacher => ({
          id: teacher.id,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          display_name: teacher.display_name || `${teacher.first_name} ${teacher.last_name}`
        }));
        
        return mappedTeachers;
      } catch (error) {
        console.error('useTeachers - Error fetching teachers:', error);
        throw error;
      }
    },
    enabled: !!schoolId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });
  
  return {
    teachers: teachers || [],
    isLoading,
    error,
    refetch
  };
};
