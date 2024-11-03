// src/app/(auth)/forgot-password/page.tsx
"use client";

import PasswordResetForm from '@/components/auth/password-reset-form';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PasswordResetForm />
    </div>
  );
}
