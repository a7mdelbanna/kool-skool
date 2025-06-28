
import React from 'react';
import { DollarSign } from 'lucide-react';
import ExpectedPaymentsSection from '@/components/ExpectedPaymentsSection';
import AccountsBalanceSection from '@/components/AccountsBalanceSection';

const FinancesPage = () => {
  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  if (!schoolId) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Finances</h1>
            <p className="text-muted-foreground">Overview of your financial accounts and expected payments</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-amber-600 text-lg">No school ID found</p>
          <p className="text-muted-foreground">Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7" />
            Finances
          </h1>
          <p className="text-muted-foreground">Overview of your financial accounts and expected payments</p>
        </div>
      </div>

      {/* Account Balances Section */}
      <div className="mb-6">
        <AccountsBalanceSection schoolId={schoolId} />
      </div>

      {/* Expected Payments Section */}
      <ExpectedPaymentsSection schoolId={schoolId} />
    </div>
  );
};

export default FinancesPage;
