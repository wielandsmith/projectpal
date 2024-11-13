export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          summary: string
          featured_image: string | null
          intro_video_url: string | null
          subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art'
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          estimated_duration: number
          duration_unit: 'minutes' | 'hours' | 'days' | 'weeks'
          learning_objectives: string
          prerequisites: string | null
          created_by: string
          created_at: string
          updated_at: string
          status: 'draft' | 'published' | 'archived'
        }
        Insert: {
          id?: string
          title: string
          summary: string
          featured_image?: string | null
          intro_video_url?: string | null
          subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art'
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          estimated_duration: number
          duration_unit: 'minutes' | 'hours' | 'days' | 'weeks'
          learning_objectives: string
          prerequisites?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          status?: 'draft' | 'published' | 'archived'
        }
        Update: {
          id?: string
          title?: string
          summary?: string
          featured_image?: string | null
          intro_video_url?: string | null
          subject?: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art'
          difficulty?: 'beginner' | 'intermediate' | 'advanced'
          estimated_duration?: number
          duration_unit?: 'minutes' | 'hours' | 'days' | 'weeks'
          learning_objectives?: string
          prerequisites?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          status?: 'draft' | 'published' | 'archived'
        }
      }
      project_steps: {
        Row: {
          id: string
          project_id: string
          title: string
          summary: string
          description: string
          video_url: string | null
          featured_image: string | null
          documentation: string | null
          estimated_duration: number
          duration_unit: 'minutes' | 'hours'
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          summary: string
          description: string
          video_url?: string | null
          featured_image?: string | null
          documentation?: string | null
          estimated_duration: number
          duration_unit: 'minutes' | 'hours'
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          summary?: string
          description?: string
          video_url?: string | null
          featured_image?: string | null
          documentation?: string | null
          estimated_duration?: number
          duration_unit?: 'minutes' | 'hours'
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      project_resources: {
        Row: {
          id: string
          project_id: string
          step_id: string | null
          file_path: string
          file_name: string
          file_type: string
          resource_type: 'material' | 'resource' | 'step_resource'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          step_id?: string | null
          file_path: string
          file_name: string
          file_type: string
          resource_type: 'material' | 'resource' | 'step_resource'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          step_id?: string | null
          file_path?: string
          file_name?: string
          file_type?: string
          resource_type?: 'material' | 'resource' | 'step_resource'
          created_at?: string
        }
      }
      content_moderation: {
        Row: {
          id: string
          project_id: string
          content_type: string
          content_id: string
          status: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderator_id: string | null
          moderated_at: string | null
          flags: string[] | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          content_type: string
          content_id: string
          status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderator_id?: string | null
          moderated_at?: string | null
          flags?: string[] | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          content_type?: string
          content_id?: string
          status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderator_id?: string | null
          moderated_at?: string | null
          flags?: string[] | null
          reason?: string | null
          created_at?: string
        }
      }
      ai_content_suggestions: {
        Row: {
          id: string
          content_type: string
          content_id: string
          original_content: string
          suggested_content: string
          suggestion_type: string
          confidence_score: number | null
          applied: boolean
          applied_at: string | null
          applied_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_type: string
          content_id: string
          original_content: string
          suggested_content: string
          suggestion_type: string
          confidence_score?: number | null
          applied?: boolean
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content_type?: string
          content_id?: string
          original_content?: string
          suggested_content?: string
          suggestion_type?: string
          confidence_score?: number | null
          applied?: boolean
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
        }
      }
      project_status_history: {
        Row: {
          id: string;
          project_id: string;
          old_status: string;
          new_status: string;
          changed_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          old_status: string;
          new_status: string;
          changed_by: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          old_status?: string;
          new_status?: string;
          changed_by?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
      project_versions: {
        Row: {
          id: string;
          project_id: string;
          version_number: number;
          changes: string;
          created_by: string;
          created_at: string;
          is_major_version: boolean;
          metadata: Json;
        };
        Insert: {
          id?: string;
          project_id: string;
          version_number: number;
          changes: string;
          created_by: string;
          created_at?: string;
          is_major_version?: boolean;
          metadata?: Json;
        };
        Update: {
          id?: string;
          project_id?: string;
          version_number?: number;
          changes?: string;
          created_by?: string;
          created_at?: string;
          is_major_version?: boolean;
          metadata?: Json;
        };
      };
      project_snapshots: {
        Row: {
          id: string;
          version_id: string;
          project_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          version_id: string;
          project_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          version_id?: string;
          project_data?: Json;
          created_at?: string;
        };
      };
      draft_conflicts: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          draft_data: Json;
          resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          draft_data: Json;
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          draft_data?: Json;
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
      };
      status_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      status_change_approvals: {
        Row: {
          id: string
          project_id: string
          requested_by: string
          requested_status: string
          current_status: string
          reason: string | null
          approved_by: string | null
          approved_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          created_at: string
          status: 'pending' | 'approved' | 'rejected'
        }
        Insert: {
          id?: string
          project_id: string
          requested_by: string
          requested_status: string
          current_status: string
          reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          status?: 'pending' | 'approved' | 'rejected'
        }
        Update: {
          id?: string
          project_id?: string
          requested_by?: string
          requested_status?: string
          current_status?: string
          reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          status?: 'pending' | 'approved' | 'rejected'
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
      user_role: 'student' | 'parent' | 'teacher'
      content_type: 'project' | 'step' | 'resource' | 'comment'
      resource_type: 'material' | 'resource' | 'step_resource'
    }
  }
} 