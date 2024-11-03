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
          full_name: string | null
          avatar_url: string | null
          role: 'student' | 'teacher' | 'parent'
        }
        Insert: {
          id: string
          created_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role: 'student' | 'teacher' | 'parent'
        }
        Update: {
          id?: string
          created_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'teacher' | 'parent'
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
