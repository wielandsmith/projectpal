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
          id: string
          title: string
          created_at: string
          subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art'
          description: string
          created_by: string
          estimated_duration: string
          learning_outcomes: string
          prerequisites: string
          updated_at: string
          status: 'active' | 'completed' | 'archived';
          progress: number;
        }
        Insert: {
          id?: string
          title: string
          created_at?: string
          subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art'
          description: string
          created_by: string
          estimated_duration: string
          learning_outcomes: string
          prerequisites?: string
          updated_at?: string
          status?: 'active' | 'completed' | 'archived';
          progress?: number;
        }
        Update: {
          id?: string
          title?: string
          created_at?: string
          subject?: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art'
          description?: string
          created_by?: string
          estimated_duration?: string
          learning_outcomes?: string
          prerequisites?: string
          updated_at?: string
          status?: 'active' | 'completed' | 'archived';
          progress?: number;
        }
      }
      project_steps: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string
          order: number
          estimated_time: string
          video_url: string | null
          created_at: string
          updated_at: string
          resources: string | null
          featured_image: string | null
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description: string
          order: number
          estimated_time: string
          video_url?: string | null
          created_at?: string
          updated_at?: string
          resources?: string | null
          featured_image?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string
          order?: number
          estimated_time?: string
          video_url?: string | null
          created_at?: string
          updated_at?: string
          resources?: string | null
          featured_image?: string | null
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