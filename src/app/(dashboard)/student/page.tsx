'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{ role: string; username?: string; email?: string } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User error:', userError);
          router.replace('/login');
          return;
        }

        if (!user) {
          console.log('No user found');
          router.replace('/login');
          return;
        }

        console.log('User found:', user.id); // Debug log

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, username')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          if (profileError.code === 'PGRST116') {
            console.log('No profile found for user');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([
                { id: user.id, role: 'student' }
              ]);
            
            if (insertError) {
              console.error('Profile creation error:', insertError);
              router.replace('/login');
              return;
            }
          } else {
            router.replace('/login');
            return;
          }
        }

        if (!profileData) {
          console.error('No profile data found');
          router.replace('/login');
          return;
        }

        if (profileData.role !== 'student') {
          console.log(`User role is ${profileData.role}, not student`);
          router.replace(`/${profileData.role}`);
          return;
        }

        setUserData({ 
          role: profileData.role,
          username: profileData.username,
          email: user.email 
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Dashboard error:', error);
        router.replace('/login');
      }
    };

    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-4">Student Dashboard</h1>
        <p className="text-gray-600">
          Welcome{userData?.username ? `, ${userData.username}` : userData?.email ? ` ${userData.email}` : ''}!
        </p>
        
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Your Learning Journey</h2>
          <p className="text-gray-600">Access your courses, assignments, and track your progress here.</p>
        </div>
      </div>
    </div>
  );
}