import React, { useState, useContext } from 'react';
import { UserContext } from '@/App';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet,
  Users,
  X,
  FileText
} from 'lucide-react';
import { databaseService } from '@/services/firebase/database.service';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  level?: string;
  notes?: string;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useContext(UserContext);
  const [csvContent, setCsvContent] = useState('');
  const [parsedStudents, setParsedStudents] = useState<StudentRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [step, setStep] = useState<'input' | 'preview' | 'uploading'>('input');

  // Sample CSV template
  const sampleCSV = `firstName,lastName,email,phone,parentName,parentPhone,level,notes
John,Doe,john.doe@email.com,+1234567890,Jane Doe,+1234567891,Intermediate,New student
Maria,Garcia,maria.g@email.com,+1234567892,Carlos Garcia,+1234567893,Beginner,Prefers morning classes
Ahmed,Hassan,ahmed.h@email.com,,,,,Transfer student`;

  // Download sample CSV
  const downloadSampleCSV = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_upload_template.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Parse CSV content with better handling of quotes and commas
  const parseCSV = (content: string): StudentRow[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse CSV line handling quotes
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    const firstNameIndex = headers.findIndex(h => h === 'firstname' || h === 'first' || h === 'fname');
    const lastNameIndex = headers.findIndex(h => h === 'lastname' || h === 'last' || h === 'lname');

    if (firstNameIndex === -1 || lastNameIndex === -1) {
      throw new Error('CSV must have firstName and lastName columns');
    }

    const students: StudentRow[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const firstName = values[firstNameIndex]?.replace(/^["']|["']$/g, '');
      const lastName = values[lastNameIndex]?.replace(/^["']|["']$/g, '');

      if (!firstName || !lastName) {
        parseErrors.push(`Row ${i + 1}: Missing first name or last name`);
        continue;
      }

      const student: StudentRow = {
        firstName,
        lastName,
        email: values[headers.indexOf('email')]?.replace(/^["']|["']$/g, '') || undefined,
        phone: values[headers.indexOf('phone')]?.replace(/^["']|["']$/g, '') || undefined,
        parentName: values[headers.indexOf('parentname')]?.replace(/^["']|["']$/g, '') || undefined,
        parentPhone: values[headers.indexOf('parentphone')]?.replace(/^["']|["']$/g, '') || undefined,
        level: values[headers.indexOf('level')]?.replace(/^["']|["']$/g, '') || undefined,
        notes: values[headers.indexOf('notes')]?.replace(/^["']|["']$/g, '') || undefined,
      };

      students.push(student);
    }

    if (parseErrors.length > 0) {
      setErrors(parseErrors);
    }

    return students;
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      handleParseCSV(content);
    };
    reader.readAsText(file);
  };

  // Handle text area input
  const handleTextInput = () => {
    if (!csvContent.trim()) {
      toast.error('Please enter CSV data');
      return;
    }
    handleParseCSV(csvContent);
  };

  // Parse and preview
  const handleParseCSV = (content: string) => {
    try {
      setErrors([]);
      const students = parseCSV(content);
      
      if (students.length === 0) {
        toast.error('No valid students found in CSV');
        return;
      }

      setParsedStudents(students);
      setStep('preview');
      toast.success(`Found ${students.length} students to import`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Helper function to process phone numbers
  const processPhoneNumber = (phone: string | undefined): { phone: string, countryCode: string } => {
    if (!phone || phone.trim() === '') return { phone: '', countryCode: '+7' }; // Default to +7 for Russian numbers
    
    // Remove any non-digit characters except the leading +
    const cleaned = phone.replace(/[^\d+]/g, '').trim();
    
    // Check if phone starts with a country code
    if (cleaned.startsWith('+')) {
      // Extract country code (supports +1 to +9999)
      const match = cleaned.match(/^(\+\d{1,4})(\d+)$/);
      if (match) {
        return {
          phone: match[2], // Phone without country code
          countryCode: match[1] // Country code with +
        };
      }
    } else if (cleaned.startsWith('7') && cleaned.length === 11) {
      // Russian number without + (e.g., 79081420431)
      return {
        phone: cleaned.substring(1), // Remove the 7
        countryCode: '+7'
      };
    } else if (cleaned.startsWith('8') && cleaned.length === 11) {
      // Russian number with 8 prefix (e.g., 89081420431)
      return {
        phone: cleaned.substring(1), // Remove the 8
        countryCode: '+7'
      };
    }
    
    // If no country code detected, return as is with default country code
    return {
      phone: cleaned,
      countryCode: '+7'
    };
  };

  // Upload students to database
  const uploadStudents = async () => {
    if (!user?.schoolId) {
      toast.error('School ID not found');
      return;
    }

    setIsUploading(true);
    setStep('uploading');
    setUploadedCount(0);
    
    const totalStudents = parsedStudents.length;
    const uploadErrors: string[] = [];

    for (let i = 0; i < parsedStudents.length; i++) {
      const student = parsedStudents[i];
      
      try {
        // Process phone numbers to separate country code from number
        const { phone: cleanPhone, countryCode } = processPhoneNumber(student.phone);
        const { phone: cleanParentPhone, countryCode: parentCountryCode } = processPhoneNumber(student.parentPhone);
        
        const studentData = {
          name: `${student.firstName} ${student.lastName}`,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email || '',
          phone: cleanPhone,
          countryCode: countryCode,
          parentName: student.parentName || '',
          parentPhone: cleanParentPhone,
          parentCountryCode: parentCountryCode,
          level: student.level || 'Beginner',
          notes: student.notes || '',
          status: 'active',
          schoolId: user.schoolId,
          createdAt: new Date(),
          updatedAt: new Date(),
          // Additional fields with defaults
          address: '',
          dateOfBirth: '',
          enrollmentDate: new Date().toISOString().split('T')[0],
          tags: [],
          totalPaid: 0,
          totalDue: 0,
          lastPaymentDate: null,
          nextPaymentDue: null,
          attendanceRate: 0,
          completedSessions: 0,
          totalSessions: 0,
        };

        await databaseService.create('students', studentData);
        setUploadedCount(i + 1);
        setUploadProgress(((i + 1) / totalStudents) * 100);
      } catch (error: any) {
        uploadErrors.push(`${student.firstName} ${student.lastName}: ${error.message}`);
      }
    }

    setIsUploading(false);

    if (uploadErrors.length > 0) {
      setErrors(uploadErrors);
      toast.error(`Uploaded ${uploadedCount} students with ${uploadErrors.length} errors`);
    } else {
      toast.success(`Successfully uploaded ${uploadedCount} students`);
      onSuccess();
      handleClose();
    }
  };

  // Reset and close
  const handleClose = () => {
    setCsvContent('');
    setParsedStudents([]);
    setErrors([]);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedCount(0);
    setStep('input');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Upload Students
          </DialogTitle>
          <DialogDescription>
            Upload multiple students at once using a CSV file. Only first name and last name are required.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            {/* Download Template */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Need a template?</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Download our CSV template with sample data to get started quickly.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                    className="mt-2"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="relative border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <Label>Paste CSV Data</Label>
              <Textarea
                placeholder="firstName,lastName,email,phone...
John,Doe,john@email.com,+1234567890..."
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <Button 
                type="button"
                onClick={handleTextInput}
                disabled={!csvContent.trim()}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Parse CSV Data
              </Button>
            </div>

            {/* Format Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Required columns:</strong> firstName, lastName<br />
                <strong>Optional columns:</strong> email, phone, parentName, parentPhone, level, notes<br />
                <strong>Note:</strong> The first row must be column headers.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Preview Import</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('input')}
              >
                Back to Input
              </Button>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedStudents.map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{index + 1}</td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {student.email || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {student.phone || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {student.level || 'Beginner'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Ready to import {parsedStudents.length} students
              </AlertDescription>
            </Alert>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Errors found:</p>
                  <ul className="text-sm space-y-1">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {errors.length > 5 && (
                      <li>... and {errors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'uploading' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
              <h3 className="font-medium text-lg mb-2">
                {isUploading ? 'Uploading Students...' : 'Upload Complete!'}
              </h3>
              <p className="text-sm text-gray-600">
                {uploadedCount} of {parsedStudents.length} students uploaded
              </p>
            </div>

            <Progress value={uploadProgress} className="h-2" />

            {!isUploading && errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Some uploads failed:</p>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {!isUploading && errors.length === 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  All students uploaded successfully!
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'input' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={uploadStudents}
                disabled={parsedStudents.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload {parsedStudents.length} Students
              </Button>
            </>
          )}

          {step === 'uploading' && !isUploading && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadDialog;