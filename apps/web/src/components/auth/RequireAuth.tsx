'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({ children, redirectTo }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const target = redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(target);
    }
  }, [isLoading, isAuthenticated, router, pathname, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500 font-medium">Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h2>
        <p className="text-sm text-gray-600 mb-6 max-w-sm">
          You need to be signed in to access this page.
        </p>
        <button
          onClick={() => {
            const target = redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`;
            router.push(target);
          }}
          className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
