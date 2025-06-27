
import { supabase } from '@/integrations/supabase/client';

export interface Contact {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export const getCurrentUserInfo = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }

  return data;
};

export const getSchoolContacts = async (schoolId: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching school contacts:', error);
    throw error;
  }

  return data || [];
};
