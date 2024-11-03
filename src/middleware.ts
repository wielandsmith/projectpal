import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const currentPath = req.nextUrl.pathname;

  // Refresh session if it exists
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Allow public routes
  if (['/login', '/register', '/forgot-password'].includes(currentPath)) {
    if (session?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileData?.role) {
        return NextResponse.redirect(new URL(`/${profileData.role}`, req.url));
      }
    }
    return res;
  }

  // Check auth for protected routes
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // For dashboard routes, verify role access
  if (currentPath.match(/^\/(student|teacher|parent)/)) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const requestedRole = currentPath.split('/')[1];
    
    if (requestedRole !== profileData?.role) {
      return NextResponse.redirect(new URL(`/${profileData?.role || 'login'}`, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}