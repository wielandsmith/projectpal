'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/components/ui/use-toast";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatingSession, setValidatingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Verify the user has a valid reset token
  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
          // Check if we have a code in the URL (from email link)
          const code = searchParams.get('code');
          if (!code) {
            throw new Error('No reset code found');
          }
        }
      } catch (error) {
        console.error('Session verification error:', error);
        toast({
          title: "Invalid or expired reset link",
          description: "Please request a new password reset link",
          variant: "destructive",
        });
        router.push('/forgot-password');
      } finally {
        setValidatingSession(false);
      }
    };

    verifySession();
  }, [router, searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully",
        description: "You can now login with your new password",
      });

      // Sign out the user after password reset
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (validatingSession) {
    return <div>Verifying reset link...</div>;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
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
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating password...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 