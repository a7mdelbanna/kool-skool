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
  ArrowDown,
  Upload,
  Image
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentMethodsService } from '@/services/paymentMethods.service';
import { uploadService } from '@/services/upload.service';
import { uploadBase64Service } from '@/services/uploadBase64.service';
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo image must be less than 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      setLogoPreview(method.icon || '');
      setLogoFile(null);
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
      setLogoPreview('');
      setLogoFile(null);
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
    setUploadingLogo(true);
    
    try {
      let logoUrl: string | undefined;
      
      // Upload logo if provided
      if (logoFile) {
        try {
          // Try Firebase Storage first
          logoUrl = await uploadService.uploadPaymentMethodLogo(logoFile, schoolId);
        } catch (error: any) {
          console.error('Error uploading to Firebase Storage:', error);
          
          // Fallback to base64 if Firebase Storage fails
          if (error?.message?.includes('Permission denied') || error?.message?.includes('storage/unauthorized')) {
            console.log('Falling back to base64 storage...');
            toast.warning('Using alternative storage method. Please configure Firebase Storage for better performance.');
            
            try {
              // Compress and convert to base64
              logoUrl = await uploadBase64Service.compressImage(logoFile, 200);
            } catch (base64Error) {
              console.error('Error with base64 fallback:', base64Error);
              toast.error('Failed to upload logo. Please try a smaller image.');
              setUploadingLogo(false);
              setSaving(false);
              return;
            }
          } else {
            toast.error('Failed to upload logo');
            setUploadingLogo(false);
            setSaving(false);
            return;
          }
        }
      }
      
      setUploadingLogo(false);

      if (editingMethod) {
        // Update existing method
        await paymentMethodsService.updatePaymentMethod(editingMethod.id!, {
          ...formData,
          icon: logoUrl || (editingMethod.icon),
          schoolId
        });
        toast.success('Payment method updated successfully');
      } else {
        // Create new method
        await paymentMethodsService.createPaymentMethod({
          ...formData,
          icon: logoUrl,
          schoolId,
          createdBy: userId,
          isDefault: methods.length === 0 // First method is default
        });
        toast.success('Payment method created successfully');
      }

      await loadPaymentMethods();
      setShowDialog(false);
      setLogoFile(null);
      setLogoPreview('');
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast.error('Failed to save payment method');
    } finally {
      setSaving(false);
      setUploadingLogo(false);
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

  const handleMoveOrder = async (methodId: string, direction: 'up' | 'down') => {
    const index = methods.findIndex(m => m.id === methodId);
    if (index === -1) return;
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === methods.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const methodToMove = methods[index];
    const methodToSwap = methods[newIndex];

    try {
      await paymentMethodsService.updatePaymentMethod(methodToMove.id!, {
        displayOrder: methodToSwap.displayOrder || newIndex
      });
      await paymentMethodsService.updatePaymentMethod(methodToSwap.id!, {
        displayOrder: methodToMove.displayOrder || index
      });
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error reordering payment methods:', error);
      toast.error('Failed to reorder payment methods');
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    if (method.icon) {
      return <img src={method.icon} alt={method.name} className="w-8 h-8 object-contain rounded" />;
    }
    
    switch (method.type) {
      case PaymentMethodType.STRIPE:
        return <CreditCard className="h-8 w-8 text-blue-600" />;
      case PaymentMethodType.MANUAL:
      default:
        return <Building className="h-8 w-8 text-gray-600" />;
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
    <>
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
              <Plus className="mr-2 h-4 w-4" />
              Add Method
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payment methods configured yet.</p>
              <Button
                onClick={() => handleOpenDialog()}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((method, index) => (
                <div
                  key={method.id}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveOrder(method.id!, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveOrder(method.id!, 'down')}
                        disabled={index === methods.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    {getMethodIcon(method)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{method.name}</span>
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                        {!method.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={method.type === PaymentMethodType.MANUAL ? 'text-gray-600' : 'text-blue-600'}
                        >
                          {method.type === PaymentMethodType.MANUAL ? 'Manual' : 'Automatic'}
                        </Badge>
                      </div>
                      {method.description && (
                        <p className="text-sm text-muted-foreground">{method.description}</p>
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
            {/* Payment Type */}
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

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Payment Method Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-full h-full object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 right-0 h-6 w-6 bg-white/80 hover:bg-white"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a logo for this payment method (PNG, JPG, max 2MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Manual Payment Fields */}
            {formData.type === PaymentMethodType.MANUAL && (
              <>
                <Separator />
                <h4 className="font-medium">Payment Details</h4>

                <div className="space-y-2">
                  <Label>Payment Instructions *</Label>
                  <Textarea
                    placeholder="Please transfer the amount to the following account and send proof of payment."
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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

            {/* Stripe Configuration */}
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
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowStripeKey(!showStripeKey)}
                    >
                      {showStripeKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your secret key is encrypted and stored securely.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDialog(false);
                setLogoFile(null);
                setLogoPreview('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingLogo}>
              {uploadingLogo ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingMethod ? 'Update' : 'Create'} Method
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentMethodsManager;