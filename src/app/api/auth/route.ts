import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Sign in the user
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 });
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    // Get user's profile and role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Could not fetch user role' }, { status: 400 });
    }

    if (!profileData?.role) {
      return NextResponse.json({ error: 'User role not found' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      role: profileData.role
    });

    // Set the auth cookie
    await supabase.auth.getSession();

    return response;

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}