
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Eye, Mail, Phone, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  tag_count: number;
}

interface ContactsListProps {
  schoolId: string;
  searchTerm: string;
  typeFilter: string;
  onEditContact: (contactId: string) => void;
  onViewTransactions: (contactId: string) => void;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'client':
      return 'bg-green-100 text-green-800';
    case 'vendor':
      return 'bg-blue-100 text-blue-800';
    case 'service_provider':
      return 'bg-purple-100 text-purple-800';
    case 'freelancer':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'service_provider':
      return 'Service Provider';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

const ContactsList: React.FC<ContactsListProps> = ({
  schoolId,
  searchTerm,
  typeFilter,
  onEditContact,
  onViewTransactions,
}) => {
  const queryClient = useQueryClient();

  // Fetch contacts
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['school-contacts', schoolId],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.rpc('get_school_contacts', {
        p_school_id: schoolId
      });

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }

      return (data as Contact[]) || [];
    },
    enabled: !!schoolId,
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('Error deleting contact:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-contacts', schoolId] });
      toast.success('Contact deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact: ' + error.message);
    },
  });

  const handleDeleteContact = (contactId: string, contactName: string) => {
    if (window.confirm(`Are you sure you want to delete ${contactName}?`)) {
      deleteContactMutation.mutate(contactId);
    }
  };

  // Filter contacts based on search term and type
  const filteredContacts = contacts?.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm);
    
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    
    return matchesSearch && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading contacts...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading contacts: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredContacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {searchTerm || typeFilter !== 'all' 
              ? 'No contacts match your search criteria' 
              : 'No contacts found. Add your first contact to get started.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredContacts.map((contact) => (
        <Card key={contact.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{contact.name}</CardTitle>
                <Badge className={`mt-1 ${getTypeColor(contact.type)}`}>
                  {getTypeLabel(contact.type)}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewTransactions(contact.id)}
                  title="View transactions"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditContact(contact.id)}
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                  title="Delete contact"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.tag_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Tag className="h-4 w-4" />
                  <span>{contact.tag_count} tag{contact.tag_count !== 1 ? 's' : ''}</span>
                </div>
              )}
              {contact.notes && (
                <p className="text-sm text-gray-500 line-clamp-2">{contact.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ContactsList;
