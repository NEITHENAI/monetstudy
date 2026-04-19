export type LearningStyle = 'Conceptual' | 'Example-heavy' | 'Detailed walkthrough';
export type Depth = 'Beginner' | 'Intermediate' | 'Advanced';
export type Goal = 'Exam Prep' | 'Deep Understanding' | 'Quick Revision';
export type Pace = 'Compact' | 'Balanced' | 'Thorough';
export type ThemeName = 'dark' | 'light' | 'midnight' | 'sepia';
export type PlanTier = 'free' | 'starter' | 'scholar' | 'unlimited';
export type SubjectStatus = 'Generating' | 'In Progress' | 'Completed';
export type TopicStatus = 'not-started' | 'in-progress' | 'completed';
export type QuizType = 'mid' | 'assessment' | 'final';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  plan: PlanTier;
  subjectLimit: number; // 1 = free, 3 = starter, 10 = scholar, -1 = unlimited
  theme: ThemeName;
  createdAt: number;
}

export interface CoursePreferences {
  style: LearningStyle;
  depth: Depth;
  goal: Goal;
  pace: Pace;
}

export interface Question {
  id: string;
  type: 'mcq' | 'tf';
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
}

export interface Topic {
  id: string;
  title: string;
  content: string;
  order: number;
  readTime: string;
  status: TopicStatus;
  midQuizScore?: number;
  assessmentScore?: number;
  midQuizQuestions?: Question[];
  assessmentQuestions?: Question[];
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  status: SubjectStatus;
  progress: number;
  topicCount: number;
  preferences: CoursePreferences;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PublicCourse {
  id: string;
  name: string;
  authorName: string;
  authorInitial: string;
  topicCount: number;
  enrolled: number;
  rating: number;
  tags: string[];
  preview: string;
}
