'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/components/ui/use-toast";

// Add type for role
type UserRole = 'student' | 'teacher' | 'parent';

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: role,
            username,
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        if (signUpError.status === 429) {
          throw new Error('Too many registration attempts. Please wait a few minutes and try again.');
        }
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('No user returned from sign up');
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          username,
          role,
          full_name: fullName,
          created_at: new Date().toISOString()
        });

      console.log('Profile creation data:', {
        id: data.user.id,
        username,
        role,
        full_name: fullName
      });

      if (profileError) {
        console.error('Profile creation error details:', JSON.stringify(profileError, null, 2));
        throw profileError;
      }

      const { data: profile, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('Verification of profile:', profile);
      if (verifyError) console.error('Verify error:', verifyError);

      toast({
        title: "Registration successful!",
        description: "Please check your email to confirm your account.",
      });

      router.push('/login');
    } catch (error) {
      console.error('Registration error details:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        setError(error.message);
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setError('An unexpected error occurred during registration');
        toast({
          title: "Registration failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Register for ProjectPal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              minLength={6}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm text-blue-500 hover:underline">
          Already have an account? Login
        </Link>
      </CardFooter>
    </Card>
  );
}
