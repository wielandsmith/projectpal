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

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign in with Supabase
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!user) throw new Error('No user returned from login');

      console.log('User data:', user);

      // Fetch the user's profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .maybeSingle();

      console.log('Profile data:', profile);
      console.log('Profile error:', profileError);

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Could not fetch user profile');
      }

      if (!profile) {
        // If no profile exists, create one from user metadata
        const { error: createProfileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: user.user_metadata.role || 'student',
            username: user.user_metadata.username,
            full_name: user.user_metadata.full_name,
            created_at: new Date().toISOString()
          });

        if (createProfileError) throw new Error('Could not create user profile');
        
        // Fetch the newly created profile
        const { data: newProfile, error: newProfileError } = await supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .single();

        if (newProfileError || !newProfile) throw new Error('Could not fetch new profile');
        
        profile = newProfile;
      }

      // Show success toast
      toast({
        title: "Login successful!",
        description: `Welcome back! Logged in as ${profile.role}`,
      });

      // Redirect based on role
      switch (profile.role) {
        case 'teacher':
          router.push('/dashboard/teacher');
          break;
        case 'parent':
          router.push('/dashboard/parent');
          break;
        case 'student':
        default:
          router.push('/dashboard/student');
          break;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Login to ProjectPal</CardTitle>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-center">
        <div className="flex flex-col space-y-1 text-sm">
          <Link href="/register" className="text-blue-500 hover:underline">
            Don't have an account? Register
          </Link>
          <Link href="/forgot-password" className="text-blue-500 hover:underline">
            Forgot your password?
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}