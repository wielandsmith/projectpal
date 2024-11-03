'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase/client';

export function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // First clear the session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }

      console.log('Logout successful, redirecting...');
      // Force a complete page refresh and redirect
      window.location.assign('/login');
      
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold">ProjectPal</h1>
          </div>
          <div>
            <Button 
              onClick={handleLogout}
              variant="outline"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}