import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  CreditCard,
  Building,
  DollarSign,
  Info,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentMethodsService } from '@/services/paymentMethods.service';
import {
  PaymentMethod,
  PaymentMethodType,
  DEFAULT_PAYMENT_METHODS
} from '@/types/payment.types';

interface PaymentMethodsManagerProps {
  schoolId: string;
  userId: string;
}

const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({
  schoolId,
  userId
}) => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: PaymentMethodType.MANUAL,
    name: '',
    description: '',
    instructions: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    routingNumber: '',
    stripePublishableKey: '',
    stripeSecretKey: '',
    isActive: true
  });

  useEffect(() => {
    loadPaymentMethods();
  }, [schoolId]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const fetchedMethods = await paymentMethodsService.getPaymentMethods(schoolId);
      
      // Initialize default methods if none exist
      if (fetchedMethods.length === 0) {
        await paymentMethodsService.initializeDefaultMethods(schoolId, userId);
        const newMethods = await paymentMethodsService.getPaymentMethods(schoolId);
        setMethods(newMethods);
      } else {
        setMethods(fetchedMethods);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        type: method.type,
        name: method.name,
        description: method.description || '',
        instructions: method.instructions || '',
        accountName: method.accountName || '',
        accountNumber: method.accountNumber || '',
        bankName: method.bankName || '',
        routingNumber: method.routingNumber || '',
        stripePublishableKey: method.stripePublishableKey || '',
        stripeSecretKey: method.stripeSecretKey || '',
        isActive: method.isActive
      });
    } else {
      setEditingMethod(null);
      setFormData({
        type: PaymentMethodType.MANUAL,
        name: '',
        description: '',
        instructions: '',
        accountName: '',
        accountNumber: '',
        bankName: '',
        routingNumber: '',
        stripePublishableKey: '',
        stripeSecretKey: '',
        isActive: true
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name) {
      toast.error('Please enter a payment method name');
      return;
    }

    if (formData.type === PaymentMethodType.STRIPE) {
      if (!formData.stripePublishableKey || !formData.stripeSecretKey) {
        toast.error('Please enter Stripe API keys');
        return;
      }
    } else if (formData.type === PaymentMethodType.MANUAL) {
      if (!formData.instructions) {
        toast.error('Please enter payment instructions');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingMethod) {
        // Update existing method
        await paymentMethodsService.updatePaymentMethod(editingMethod.id!, {
          ...formData,
          schoolId
        });
        toast.success('Payment method updated successfully');
      } else {
        // Create new method
        await paymentMethodsService.createPaymentMethod({
          ...formData,
          schoolId,
          createdBy: userId,
          isDefault: methods.length === 0 // First method is default
        });
        toast.success('Payment method created successfully');
      }

      await loadPaymentMethods();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast.error('Failed to save payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await paymentMethodsService.deletePaymentMethod(methodId);
      toast.success('Payment method deleted successfully');
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      await paymentMethodsService.updatePaymentMethod(method.id!, {
        isActive: !method.isActive
      });
      await loadPaymentMethods();
      toast.success(`Payment method ${!method.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling payment method:', error);
      toast.error('Failed to update payment method');
    }
  };

  const handleSetDefault = async (method: PaymentMethod) => {
    try {
      await paymentMethodsService.updatePaymentMethod(method.id!, {
        isDefault: true,
        schoolId
      });
      await loadPaymentMethods();
      toast.success('Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error('Failed to set default payment method');
    }
  };

  const handleMoveUp = async (method: PaymentMethod, index: number) => {
    if (index === 0) return;

    const newMethods = [...methods];
    const prevMethod = newMethods[index - 1];
    const currentOrder = method.displayOrder || index;
    const prevOrder = prevMethod.displayOrder || index - 1;

    try {
      await paymentMethodsService.updatePaymentMethod(method.id!, {
        displayOrder: prevOrder
      });
      await paymentMethodsService.updatePaymentMethod(prevMethod.id!, {
        displayOrder: currentOrder
      });
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error reordering payment methods:', error);
      toast.error('Failed to reorder payment methods');
    }
  };

  const handleMoveDown = async (method: PaymentMethod, index: number) => {
    if (index === methods.length - 1) return;

    const newMethods = [...methods];
    const nextMethod = newMethods[index + 1];
    const currentOrder = method.displayOrder || index;
    const nextOrder = nextMethod.displayOrder || index + 1;

    try {
      await paymentMethodsService.updatePaymentMethod(method.id!, {
        displayOrder: nextOrder
      });
      await paymentMethodsService.updatePaymentMethod(nextMethod.id!, {
        displayOrder: currentOrder
      });
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error reordering payment methods:', error);
      toast.error('Failed to reorder payment methods');
    }
  };

  const getMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case PaymentMethodType.STRIPE:
        return <CreditCard className="h-4 w-4" />;
      case PaymentMethodType.MANUAL:
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Configure payment methods for your school. Students will use these to make payments.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payment methods configured yet.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {methods.map((method, index) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(method, index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(method, index)}
                        disabled={index === methods.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      {getMethodIcon(method.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{method.name}</h4>
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                        {!method.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {method.type === PaymentMethodType.MANUAL ? 'Manual' : 'Automatic'}
                        </Badge>
                      </div>
                      {method.description && (
                        <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(method)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Switch
                      checked={method.isActive}
                      onCheckedChange={() => handleToggleActive(method)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(method)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(method.id!)}
                      disabled={method.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
            </DialogTitle>
            <DialogDescription>
              Configure the payment method details and instructions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Method Type */}
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: PaymentMethodType) => 
                  setFormData({ ...formData, type: value })
                }
                disabled={!!editingMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethodType.MANUAL}>
                    Manual (Bank Transfer, Cash, etc.)
                  </SelectItem>
                  <SelectItem value={PaymentMethodType.STRIPE}>
                    Stripe (Automatic Card Payments)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Method Name */}
            <div className="space-y-2">
              <Label>Method Name *</Label>
              <Input
                placeholder="e.g., Bank Transfer, Credit Card"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of this payment method"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Manual Payment Fields */}
            {formData.type === PaymentMethodType.MANUAL && (
              <>
                <Separator />
                <h4 className="font-medium">Payment Details</h4>

                <div className="space-y-2">
                  <Label>Payment Instructions *</Label>
                  <Textarea
                    placeholder="Enter detailed instructions for making payment..."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    These instructions will be shown to students when they select this payment method.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="Account holder name"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      placeholder="Bank account number"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      placeholder="Name of the bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Routing/SWIFT Code</Label>
                    <Input
                      placeholder="Routing or SWIFT code"
                      value={formData.routingNumber}
                      onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Stripe Fields */}
            {formData.type === PaymentMethodType.STRIPE && (
              <>
                <Separator />
                <h4 className="font-medium">Stripe Configuration</h4>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You can find your Stripe API keys in your{' '}
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Stripe Dashboard
                    </a>
                    . Use test keys for testing and live keys for production.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Publishable Key *</Label>
                  <Input
                    placeholder="pk_test_... or pk_live_..."
                    value={formData.stripePublishableKey}
                    onChange={(e) => setFormData({ ...formData, stripePublishableKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Secret Key *</Label>
                  <div className="relative">
                    <Input
                      type={showStripeKey ? 'text' : 'password'}
                      placeholder="sk_test_... or sk_live_..."
                      value={formData.stripeSecretKey}
                      onChange={(e) => setFormData({ ...formData, stripeSecretKey: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowStripeKey(!showStripeKey)}
                      type="button"
                    >
                      {showStripeKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This key is encrypted and stored securely.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethodsManager;