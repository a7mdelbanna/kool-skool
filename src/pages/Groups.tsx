
import React from 'react';
import { UsersRound } from 'lucide-react';

const Groups = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <UsersRound className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600">Manage group lessons and subscriptions</p>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <UsersRound className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Groups Page</h2>
          <p className="text-gray-600">
            This is a placeholder for the Groups page. Group lesson management features will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Groups;
