
import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Mock data for contacts - replace with actual database fetch
const mockContacts = [
  {
    id: '1',
    name: 'ABC Marketing Agency',
    type: 'Vendor',
    email: 'contact@abcmarketing.com',
    phone: '+1 (555) 123-4567',
    notes: 'Marketing and advertising services for school promotion',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'John Smith Construction',
    type: 'Service Provider',
    email: 'john@smithconstruction.com',
    phone: '+1 (555) 234-5678',
    notes: 'Facility maintenance and repairs',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Tech Solutions Inc',
    type: 'Vendor',
    email: 'support@techsolutions.com',
    phone: '+1 (555) 345-6789',
    notes: 'IT equipment and software provider',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Sarah Johnson',
    type: 'Client',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 456-7890',
    notes: 'Parent interested in advanced math programs',
    createdAt: '2024-03-25',
  },
  {
    id: '5',
    name: 'Office Supplies Plus',
    type: 'Vendor',
    email: 'orders@officesupplies.com',
    phone: '+1 (555) 567-8901',
    notes: 'Regular supplier for classroom materials',
    createdAt: '2024-04-05',
  },
];

const contactTypes = ['All Types', 'Client', 'Vendor', 'Service Provider', 'Partner'];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Client':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'Vendor':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'Service Provider':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
    case 'Partner':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

const Contacts = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');

  // Filter contacts based on search term and type
  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone.includes(searchTerm) ||
                         contact.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'All Types' || contact.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleViewDetails = (contact: any) => {
    toast({
      title: "Contact Details",
      description: `Viewing details for ${contact.name}`,
    });
  };

  const handleEditContact = (contact: any) => {
    toast({
      title: "Edit Contact",
      description: `Edit functionality for ${contact.name} will be implemented`,
    });
  };

  const handleDeleteContact = (contact: any) => {
    toast({
      title: "Delete Contact",
      description: `Delete confirmation for ${contact.name} will be implemented`,
      variant: "destructive",
    });
  };

  const handleAddContact = () => {
    toast({
      title: "Add New Contact",
      description: "Add contact form will be implemented",
    });
  };

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockContacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockContacts.filter(c => c.type === 'Vendor').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockContacts.filter(c => c.type === 'Client').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Service Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockContacts.filter(c => c.type === 'Service Provider').length}
            </div>
          </CardContent>
        </Card>
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
                {contactTypes.map((type) => (
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
                          : 'No contacts available'
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
                          className={getTypeColor(contact.type)}
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
                            {contact.notes}
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
    </div>
  );
};

export default Contacts;
