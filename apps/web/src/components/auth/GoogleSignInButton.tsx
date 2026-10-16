'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const googleSignInUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/google/start`;

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  function startGoogleSignIn() {
    setLoading(true);
    window.location.assign(googleSignInUrl);
  }

  return (
    <button
      type="button"
      onClick={startGoogleSignIn}
      disabled={loading}
      aria-busy={loading}
      className="mb-5 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow disabled:cursor-wait disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Connecting to Google…
        </>
      ) : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.22Z" />
            <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.6Z" />
            <path fill="#FBBC05" d="M6.53 13.69A5.85 5.85 0 0 1 6.22 12c0-.59.11-1.16.31-1.69V7.78H3.28A9.7 9.7 0 0 0 2.25 12c0 1.52.36 2.95 1.03 4.22l3.25-2.53Z" />
            <path fill="#EA4335" d="M12 6.28c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.35 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.72 5.38l3.25 2.53c.77-2.31 2.93-4.03 5.47-4.03Z" />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
