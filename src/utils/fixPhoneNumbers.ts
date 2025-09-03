import { databaseService } from '@/services/firebase/database.service';

/**
 * One-time migration script to fix phone numbers with duplicate country codes
 * This function will clean up phone numbers that were stored incorrectly from bulk uploads
 */
export const fixDuplicatePhoneNumbers = async () => {
  console.log('Starting phone number fix migration...');
  
  try {
    // Get all students
    const students = await databaseService.getAll('students');
    console.log(`Found ${students.length} students to check`);
    
    let fixedCount = 0;
    const errors: string[] = [];
    
    for (const student of students) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Process main phone number
      if (student.phone) {
        const phoneStr = student.phone.toString();
        const countryCode = student.countryCode || '+7';
        
        // Check if phone starts with the country code (without +)
        const countryCodeWithoutPlus = countryCode.replace('+', '');
        
        if (phoneStr.startsWith('+' + countryCodeWithoutPlus + countryCodeWithoutPlus)) {
          // Double country code with + (e.g., +779081420431 where it should be +79081420431)
          updates.phone = phoneStr.substring(countryCodeWithoutPlus.length + 1);
          needsUpdate = true;
          console.log(`Fixing phone for ${student.firstName} ${student.lastName}: ${phoneStr} -> +${countryCodeWithoutPlus}${updates.phone}`);
        } else if (phoneStr.startsWith(countryCodeWithoutPlus + countryCodeWithoutPlus)) {
          // Double country code without + (e.g., 779081420431)
          updates.phone = phoneStr.substring(countryCodeWithoutPlus.length);
          needsUpdate = true;
          console.log(`Fixing phone for ${student.firstName} ${student.lastName}: ${phoneStr} -> ${countryCode}${updates.phone}`);
        } else if (phoneStr.startsWith('+')) {
          // Phone has + but might have country code embedded
          const match = phoneStr.match(/^(\+\d{1,4})(\d+)$/);
          if (match) {
            updates.countryCode = match[1];
            updates.phone = match[2];
            needsUpdate = true;
            console.log(`Extracting country code for ${student.firstName} ${student.lastName}: ${phoneStr} -> ${match[1]} ${match[2]}`);
          }
        } else if (phoneStr.startsWith('7') && phoneStr.length === 11) {
          // Russian number without +
          updates.phone = phoneStr.substring(1);
          updates.countryCode = '+7';
          needsUpdate = true;
          console.log(`Fixing Russian number for ${student.firstName} ${student.lastName}: ${phoneStr} -> +7${updates.phone}`);
        } else if (phoneStr.startsWith('8') && phoneStr.length === 11) {
          // Russian number with 8 prefix
          updates.phone = phoneStr.substring(1);
          updates.countryCode = '+7';
          needsUpdate = true;
          console.log(`Fixing Russian number with 8 for ${student.firstName} ${student.lastName}: ${phoneStr} -> +7${updates.phone}`);
        }
      }
      
      // Process parent phone if exists
      if (student.parentPhone) {
        const parentPhoneStr = student.parentPhone.toString();
        const parentCountryCode = student.parentCountryCode || '+7';
        const countryCodeWithoutPlus = parentCountryCode.replace('+', '');
        
        if (parentPhoneStr.startsWith(countryCodeWithoutPlus + countryCodeWithoutPlus)) {
          updates.parentPhone = parentPhoneStr.substring(countryCodeWithoutPlus.length);
          needsUpdate = true;
          console.log(`Fixing parent phone for ${student.firstName} ${student.lastName}: ${parentPhoneStr} -> ${parentCountryCode}${updates.parentPhone}`);
        }
      }
      
      // Update the student if needed
      if (needsUpdate) {
        try {
          await databaseService.update('students', student.id, updates);
          fixedCount++;
          console.log(`✓ Updated ${student.firstName} ${student.lastName}`);
        } catch (error) {
          const errorMsg = `Failed to update ${student.firstName} ${student.lastName}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Fixed ${fixedCount} students`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
      errors.forEach(err => console.error(err));
    }
    
    return {
      success: true,
      fixedCount,
      totalChecked: students.length,
      errors
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error
    };
  }
};

// Function to be called from console or a button
export const runPhoneNumberFix = async () => {
  const result = await fixDuplicatePhoneNumbers();
  console.log('Migration result:', result);
  return result;
};