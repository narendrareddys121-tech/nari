'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@bidrush/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const googleError = {
    google_not_configured:
      'Google sign-in is not connected yet. Add your Google OAuth credentials to apps/api/.env, restart the API, and try again.',
    google_cancelled: 'Google sign-in was cancelled. You can try again or continue with email.',
    google_failed: 'Google could not verify this sign-in. Check the selected account and try again.',
    google_error: 'Google sign-in could not be completed. Please try again.',
  }[searchParams.get('error') ?? ''] ?? null;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      toast({
        title: 'Welcome back!',
        description: 'You have signed in successfully.',
      });
      const redirectUrl = searchParams.get('redirect') || '/auctions';
      router.push(redirectUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm rounded-xl bg-white">
      <CardHeader className="space-y-1.5 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-center text-gray-900">
          Sign In
        </CardTitle>
        <CardDescription className="text-center text-gray-500 text-sm">
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {googleError && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="alert">
            <p className="font-semibold">Google sign-in needs setup</p>
            <p className="mt-1">{googleError}</p>
            {searchParams.get('error') === 'google_not_configured' && (
              <p className="mt-2 text-xs text-amber-800">
                The email and password sign-in below is ready to use now.
              </p>
            )}
          </div>
        )}
        <GoogleSignInButton />
        <div className="mb-5 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or continue with email
          <span className="h-px flex-1 bg-gray-200" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Email address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      disabled={isLoading}
                      className="border-gray-300 focus-visible:ring-black focus-visible:border-black rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium text-gray-900">
                      Password
                    </FormLabel>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-gray-600 hover:text-black transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="pr-10 border-gray-300 focus-visible:ring-black focus-visible:border-black rounded-lg"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-black text-white hover:bg-gray-800 font-medium rounded-lg transition-colors mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-gray-100 pt-5 pb-6">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-black hover:underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border border-gray-200 shadow-sm rounded-xl bg-white p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-black" />
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
