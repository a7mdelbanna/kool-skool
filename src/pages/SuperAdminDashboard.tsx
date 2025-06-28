
import React, { useContext, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserContext } from '@/App';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Plus, Search, Key, Calendar, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreateLicenseDialog from '@/components/CreateLicenseDialog';

interface License {
  license_id: string;
  license_key: string;
  expires_at: string;
  duration_days: number;
  is_active: boolean;
  license_created_at: string;
  school_id: string | null;
  school_name: string | null;
  school_created_at: string | null;
}

interface UpdateLicenseResponse {
  success: boolean;
  message: string;
}

const SuperAdminDashboard = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [filteredLicenses, setFilteredLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is a super admin
    if (!user || user.role !== 'superadmin') {
      console.log('Non-super admin or unauthenticated user, redirecting to super admin login...');
      navigate('/superadmin-login');
      return;
    }
    
    fetchLicenses();
  }, [user, navigate]);

  useEffect(() => {
    // Filter licenses based on search term
    if (!searchTerm) {
      setFilteredLicenses(licenses);
    } else {
      const filtered = licenses.filter(license => 
        license.license_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (license.school_name && license.school_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredLicenses(filtered);
    }
  }, [searchTerm, licenses]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING ALL LICENSES ===');
      
      const { data, error } = await supabase.rpc('get_all_licenses_with_schools');
      
      if (error) {
        console.error('Error fetching licenses:', error);
        toast.error('Failed to load licenses');
        return;
      }
      
      console.log('Licenses data:', data);
      setLicenses(data || []);
      
    } catch (error) {
      console.error('Error in fetchLicenses:', error);
      toast.error('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLicense = async (licenseId: string, currentStatus: boolean) => {
    try {
      console.log('Toggling license:', licenseId, 'from', currentStatus, 'to', !currentStatus);
      
      const { data, error } = await supabase.rpc('update_license_status', {
        p_license_id: licenseId,
        p_is_active: !currentStatus
      });
      
      if (error) {
        console.error('Error updating license status:', error);
        toast.error('Failed to update license status');
        return;
      }
      
      console.log('License status update result:', data);
      
      // Type assertion for the response - first cast to unknown, then to our interface
      const result = data as unknown as UpdateLicenseResponse;
      
      if (result?.success) {
        toast.success(`License ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
        fetchLicenses(); // Refresh the list
      } else {
        toast.error(result?.message || 'Failed to update license status');
      }
      
    } catch (error) {
      console.error('Error in handleToggleLicense:', error);
      toast.error('Failed to update license status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    toast.success('Logged out successfully');
    navigate('/superadmin-login');
  };

  const handleLicenseCreated = () => {
    fetchLicenses(); // Refresh the list
    setCreateDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Access Denied</p>
          <Button onClick={() => navigate('/superadmin-login')} className="mt-4">
            Go to Super Admin Login
          </Button>
        </div>
      </div>
    );
  }

  const activeLicensesCount = licenses.filter(l => l.is_active).length;
  const totalLicensesCount = licenses.length;
  const schoolsWithLicenses = licenses.filter(l => l.school_id).length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Super Admin Portal
                </h1>
                <p className="text-sm text-gray-500">License Management System</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLicensesCount}</div>
              <p className="text-xs text-muted-foreground">
                {activeLicensesCount} active, {totalLicensesCount - activeLicensesCount} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
              <ToggleRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeLicensesCount}</div>
              <p className="text-xs text-muted-foreground">
                Currently enabled licenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schools</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schoolsWithLicenses}</div>
              <p className="text-xs text-muted-foreground">
                Schools with licenses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Search */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search licenses or schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create License
          </Button>
        </div>

        {/* Licenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Licenses</CardTitle>
            <CardDescription>
              Manage all school licenses and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLicenses.map((license) => (
                  <TableRow key={license.license_id}>
                    <TableCell className="font-mono text-sm">
                      {license.license_key}
                    </TableCell>
                    <TableCell>
                      {license.school_name ? (
                        <div>
                          <div className="font-medium">{license.school_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Since {format(new Date(license.school_created_at!), 'MMM yyyy')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={license.is_active ? 'default' : 'secondary'}>
                        {license.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(license.expires_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(license.expires_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {license.duration_days} days
                    </TableCell>
                    <TableCell>
                      {format(new Date(license.license_created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleLicense(license.license_id, license.is_active)}
                        className="h-8 w-8 p-0"
                      >
                        {license.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLicenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No licenses match your search.' : 'No licenses found.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create License Dialog */}
      <CreateLicenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onLicenseCreated={handleLicenseCreated}
      />
    </div>
  );
};

export default SuperAdminDashboard;
