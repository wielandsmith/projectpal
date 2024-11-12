export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          username: string | null
          role: 'student' | 'parent' | 'teacher'
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          username?: string | null
          role?: 'student' | 'parent' | 'teacher'
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          username?: string | null
          role?: 'student' | 'parent' | 'teacher'
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      projects: {
        Row: {
          id: string;
          title: string;
          summary: string;
          featured_image: string | null;
          intro_video_url: string | null;
          subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art';
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimated_duration: number;
          duration_unit: 'minutes' | 'hours' | 'days' | 'weeks';
          learning_objectives: string;
          prerequisites: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          status: 'draft' | 'published' | 'archived';
        }
        Insert: {
          id?: string;
          title: string;
          summary: string;
          featured_image?: string | null;
          intro_video_url?: string | null;
          subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art';
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimated_duration: number;
          duration_unit: 'minutes' | 'hours' | 'days' | 'weeks';
          learning_objectives: string;
          prerequisites?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          status?: 'draft' | 'published' | 'archived';
        }
        Update: {
          id?: string;
          title?: string;
          summary?: string;
          featured_image?: string | null;
          intro_video_url?: string | null;
          subject?: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art';
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          estimated_duration?: number;
          duration_unit?: 'minutes' | 'hours' | 'days' | 'weeks';
          learning_objectives?: string;
          prerequisites?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'draft' | 'published' | 'archived';
        }
      }
      project_steps: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          summary: string;
          description: string;
          video_url: string | null;
          featured_image: string | null;
          documentation: string | null;
          estimated_duration: number;
          duration_unit: 'minutes' | 'hours';
          order_index: number;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          summary: string;
          description: string;
          video_url?: string | null;
          featured_image?: string | null;
          documentation?: string | null;
          estimated_duration: number;
          duration_unit: 'minutes' | 'hours';
          order_index: number;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          summary?: string;
          description?: string;
          video_url?: string | null;
          featured_image?: string | null;
          documentation?: string | null;
          estimated_duration?: number;
          duration_unit?: 'minutes' | 'hours';
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        }
      }
      project_resources: {
        Row: {
          id: string;
          project_id: string;
          step_id: string | null;
          file_path: string;
          file_name: string;
          file_type: string;
          resource_type: 'material' | 'resource' | 'step_resource';
          created_at: string;
        }
        Insert: {
          id?: string;
          project_id: string;
          step_id?: string | null;
          file_path: string;
          file_name: string;
          file_type: string;
          resource_type: 'material' | 'resource' | 'step_resource';
          created_at?: string;
        }
        Update: {
          id?: string;
          project_id?: string;
          step_id?: string | null;
          file_path?: string;
          file_name?: string;
          file_type?: string;
          resource_type?: 'material' | 'resource' | 'step_resource';
          created_at?: string;
        }
      }
      step_resources: {
        Row: {
          id: string
          step_id: string
          title: string
          created_at: string
          type: 'pdf' | 'image' | 'video' | 'link'
          url: string
          description: string
        }
        Insert: {
          id?: string
          step_id: string
          title: string
          created_at?: string
          type: 'pdf' | 'image' | 'video' | 'link'
          url: string
          description: string
        }
        Update: {
          id?: string
          step_id?: string
          title?: string
          created_at?: string
          type?: 'pdf' | 'image' | 'video' | 'link'
          url?: string
          description?: string
        }
      }
      children: {
        Row: {
          id: string
          parent_id: string
          child_id: string
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          child_id: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          child_id?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string;
          title: string;
          date: string;
          student_id: string;
          description: string;
          created_at: string;
        }
        Insert: {
          id: string;
          title: string;
          date: string;
          student_id: string;
          description: string;
          created_at: string;
        }
        Update: {
          id: string;
          title: string;
          date: string;
          student_id: string;
          description: string;
          created_at: string;
        }
      }
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          subject: string;
          content: string;
          read: boolean;
          created_at: string;
        }
        Insert: {
          id: string;
          sender_id: string;
          recipient_id: string;
          subject: string;
          content: string;
          read: boolean;
          created_at: string;
        }
        Update: {
          id: string;
          sender_id: string;
          recipient_id: string;
          subject: string;
          content: string;
          read: boolean;
          created_at: string;
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 