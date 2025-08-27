import React from 'react';
import { 
  GraduationCap, 
  Tags,
  BookOpen
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TransactionCategoriesManagement from '@/components/TransactionCategoriesManagement';
import TagManager from '@/components/TagManager';
import StudentLevelsManagement from '@/components/StudentLevelsManagement';

const AcademicSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Academic Settings</h1>
        <p className="text-muted-foreground mt-1">Manage student levels, categories, and tags for better organization</p>
      </div>
      
      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="levels" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>Levels</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Categories</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tags className="h-4 w-4" />
            <span>Tags</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="mt-0 space-y-6">
          <StudentLevelsManagement />
        </TabsContent>

        <TabsContent value="categories" className="mt-0 space-y-6">
          <TransactionCategoriesManagement />
        </TabsContent>

        <TabsContent value="tags" className="mt-0 space-y-6">
          <TagManager showUsageCount={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicSettings;