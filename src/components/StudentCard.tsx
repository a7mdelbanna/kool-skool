import React from 'react';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  lessonType: 'individual' | 'group';
  ageGroup: 'adult' | 'kid';
  courseName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'fluent';
  paymentStatus: string;
  teacherId?: string;
  lessonsCompleted?: number;
  nextLesson?: string;
  phone?: string;
  dateOfBirth?: string;
  // Separate social media fields
  telegram?: string;
  whatsapp?: string;
  instagram?: string;
  viber?: string;
  facebook?: string;
  skype?: string;
  zoom?: string;
}
