
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

interface Subject {
  id: string;
  name: string;
  retentionRate: number;
}

interface SubjectPerformanceCardProps {
  subjects: Subject[];
  className?: string;
}

const SubjectPerformanceCard: React.FC<SubjectPerformanceCardProps> = ({ subjects, className }) => {
  const [sortBy, setSortBy] = useState<string>("retentionRate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };
  
  const getSortedSubjects = () => {
    return [...subjects].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "retentionRate") {
        comparison = a.retentionRate - b.retentionRate;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };
  
  const sortedSubjects = getSortedSubjects();
  
  // Calculate performance tiers
  const getPerformanceTier = (rate: number) => {
    if (rate >= 85) return { label: "Excellent", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" };
    if (rate >= 75) return { label: "Good", class: "bg-blue-500/10 text-blue-500 border-blue-500/30" };
    if (rate >= 65) return { label: "Average", class: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
    return { label: "Needs Improvement", class: "bg-red-500/10 text-red-500 border-red-500/30" };
  };
  
  return (
    <Card className={`glass-card glass-card-hover ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-foreground">Top Performing Subjects</CardTitle>
          <p className="text-sm text-muted-foreground">Subjects with highest student retention</p>
        </div>
        <Select
          defaultValue="retentionRate"
          onValueChange={(value) => setSortBy(value)}
        >
          <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-sm border-border/50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retentionRate">Retention Rate</SelectItem>
            <SelectItem value="name">Subject Name</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50 backdrop-blur-sm">
            <TableRow>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => toggleSort("name")}
              >
                Subject {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right" 
                onClick={() => toggleSort("retentionRate")}
              >
                Retention Rate {sortBy === "retentionRate" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="text-right">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSubjects.map((subject) => {
              const performance = getPerformanceTier(subject.retentionRate);
              
              return (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-medium text-foreground">{subject.retentionRate}%</span>
                      <div className="w-24 h-2 bg-background/50 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${subject.retentionRate}%`,
                            background: subject.retentionRate >= 85 ? '#10b981' :
                                      subject.retentionRate >= 75 ? '#3b82f6' :
                                      subject.retentionRate >= 65 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={performance.class}>
                      {performance.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectPerformanceCard;
