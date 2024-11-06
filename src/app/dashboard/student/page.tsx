'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface Project {
  id: string;
  title: string;
  subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art';
  description: string;
  progress: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  estimated_duration: string;
  learning_outcomes: string;
  prerequisites: string;
}

interface Profile {
  username: string | null;
  full_name: string | null;
  role: 'student' | 'parent' | 'teacher';
}

export default function StudentDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          throw new Error('No user found');
        }

        // Get user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name, role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profile);

        // Get user's projects
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id,
            title,
            subject,
            description,
            progress,
            created_at,
            updated_at,
            created_by,
            estimated_duration,
            learning_outcomes,
            prerequisites
          `)
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;
        setProjects(projects || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error loading dashboard",
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {profile?.full_name || 'Student'}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Here's an overview of your learning journey</p>
        </CardContent>
      </Card>

      {/* Current Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Current Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <div className="text-sm text-gray-500 capitalize">{project.subject}</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{project.description}</p>
                    {/* Add progress bar component here */}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No projects assigned yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">No new messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">No resources available</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 