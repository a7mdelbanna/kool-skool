
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentUserInfo } from '@/integrations/supabase/client';
import ContactsList from '@/components/contacts/ContactsList';
import ContactDialog from '@/components/contacts/ContactDialog';
import TransactionsByContact from '@/components/contacts/TransactionsByContact';

const Contacts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  const schoolId = userInfo?.[0]?.user_school_id;

  const handleEditContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowContactDialog(true);
  };

  const handleViewTransactions = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowTransactions(true);
  };

  const handleCloseDialog = () => {
    setShowContactDialog(false);
    setSelectedContactId(null);
  };

  const handleCloseTransactions = () => {
    setShowTransactions(false);
    setSelectedContactId(null);
  };

  if (!schoolId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">Loading...</div>
          <div className="text-sm text-gray-500">Please wait while we load your contacts</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Manage your clients, vendors, and service providers</p>
        </div>
        <Button onClick={() => setShowContactDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find contacts quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="service_provider">Service Provider</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <ContactsList
        schoolId={schoolId}
        searchTerm={searchTerm}
        typeFilter={typeFilter}
        onEditContact={handleEditContact}
        onViewTransactions={handleViewTransactions}
      />

      {/* Contact Dialog */}
      <ContactDialog
        open={showContactDialog}
        onOpenChange={handleCloseDialog}
        contactId={selectedContactId}
        schoolId={schoolId}
      />

      {/* Transactions by Contact Dialog */}
      <TransactionsByContact
        open={showTransactions}
        onOpenChange={handleCloseTransactions}
        contactId={selectedContactId}
        schoolId={schoolId}
      />
    </div>
  );
};

export default Contacts;
