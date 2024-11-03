// types/projects.ts

// Enumerated types for better type safety
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type SubjectType = 'math' | 'science' | 'history' | 'geography' | 'english' | 'art';

// Resource type for project materials
export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'image' | 'video' | 'link';
  url: string;
  description?: string;
}

// Step type for project instructions
export interface ProjectStep {
  id: string;
  title: string;
  description: string;
  order: number;
  resources: Resource[];
  estimatedTime?: string;
  videoUrl?: string;
  imageUrls?: string[];
}

// Progress tracking for steps
export interface StepProgress {
  stepId: string;
  completed: boolean;
  completedAt?: Date;
  submissions?: ProjectSubmission[];
}

// Project submission type
export interface ProjectSubmission {
  id: string;
  projectId: string;
  userId: string;
  summary: string;
  mediaUrls: string[];
  submittedAt: Date;
  feedback?: string;
}

// Main project interface
export interface Project {
  id: string;
  title: string;
  subject: SubjectType;
  description: string;
  materials: string[];
  steps: ProjectStep[];
  resources: Resource[];
  createdBy: string;
  difficulty: Difficulty;
  estimatedDuration?: string;
  learningOutcomes?: string[];
  prerequisites?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Project progress tracking
export interface ProjectProgress {
  projectId: string;
  userId: string;
  startedAt: Date;
  lastUpdated: Date;
  status: 'not-started' | 'in-progress' | 'completed';
  currentStep: number;
  stepProgress: StepProgress[];
}