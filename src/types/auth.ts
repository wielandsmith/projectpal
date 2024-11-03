export type UserRole = 'student' | 'teacher' | 'parent';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  profileImage?: string;
}