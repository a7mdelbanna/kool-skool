
import React, { useState, useEffect, useContext } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase, getSchoolContactTypes } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import ContactDialog from '@/components/ContactDialog';

interface Contact {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

interface ContactType {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

const Contacts = () => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [contactDialog, setContactDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    contact?: Contact;
  }>({ open: false, mode: 'add' });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    contact?: Contact;
  }>({ open: false });

  const fetchContactTypes = async () => {
    if (!user?.schoolId) return;

    try {
      const types = await getSchoolContactTypes(user.schoolId);
      setContactTypes(types || []);
    } catch (error) {
      console.error('Error fetching contact types:', error);
      toast({
        title: "Error",
        description: "Failed to load contact types",
        variant: "destructive",
      });
    }
  };

  const fetchContacts = async () => {
    if (!user?.schoolId) return;

    try {
      // Use direct query instead of RPC to bypass RLS issues
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('school_id', user.schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactTypes();
    fetchContacts();
  }, [user?.schoolId]);

  // Get contact type color
  const getTypeColor = (typeName: string) => {
    const contactType = contactTypes.find(ct => ct.name === typeName);
    return contactType?.color || '#6B7280';
  };

  // Create dynamic contact type filter options
  const contactTypeOptions = ['All Types', ...contactTypes.map(ct => ct.name)];

  // Filter contacts based on search term and type
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (contact.phone && contact.phone.includes(searchTerm)) ||
                         (contact.notes && contact.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'All Types' || contact.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleAddContact = () => {
    setContactDialog({ open: true, mode: 'add' });
  };

  const handleEditContact = (contact: Contact) => {
    setContactDialog({ open: true, mode: 'edit', contact });
  };

  const handleDeleteContact = (contact: Contact) => {
    setDeleteDialog({ open: true, contact });
  };

  const confirmDeleteContact = async () => {
    if (!deleteDialog.contact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', deleteDialog.contact.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });

      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ open: false });
    }
  };

  const handleViewDetails = (contact: Contact) => {
    toast({
      title: "Contact Details",
      description: `Viewing details for ${contact.name}`,
    });
  };

  const handleRefresh = () => {
    fetchContacts();
    fetchContactTypes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your business contacts, vendors, and clients
          </p>
        </div>
        <Button onClick={handleAddContact} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Dynamic Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        {contactTypes.slice(0, 3).map((type) => (
          <Card key={type.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {type.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contacts.filter(c => c.type === type.name).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find contacts by name, email, phone, or notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contactTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Contacts ({filteredContacts.length})
          </CardTitle>
          <CardDescription>
            {selectedType !== 'All Types' && `Filtered by: ${selectedType}`}
            {searchTerm && ` • Search: "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm || selectedType !== 'All Types' 
                          ? 'No contacts found matching your criteria'
                          : 'No contacts available. Click "Add Contact" to get started.'
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          style={{
                            backgroundColor: `${getTypeColor(contact.type)}20`,
                            color: getTypeColor(contact.type),
                            borderColor: getTypeColor(contact.type)
                          }}
                        >
                          {contact.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {contact.email && (
                            <div className="text-sm">{contact.email}</div>
                          )}
                          {contact.phone && (
                            <div className="text-sm text-muted-foreground">
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.notes || 'No notes'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleViewDetails(contact)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEditContact(contact)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteContact(contact)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Contact Dialog */}
      <ContactDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog(prev => ({ ...prev, open }))}
        contact={contactDialog.contact}
        mode={contactDialog.mode}
        onSuccess={handleRefresh}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.contact?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;
