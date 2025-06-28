
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TagManager from '@/components/TagManager';

const TagsManagement = () => {
  return (
    <Card className="glass glass-hover">
      <CardHeader>
        <CardTitle>Tags Management</CardTitle>
        <CardDescription>Create and manage tags for organizing your transactions and payments</CardDescription>
      </CardHeader>
      <CardContent>
        <TagManager showUsageCount={true} />
      </CardContent>
    </Card>
  );
};

export default TagsManagement;
