'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@bidrush/shared';
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
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onChange',
  });

  const passwordValue = form.watch('password') || '';
  const hasMinLength = passwordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const passwordScore = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length;
  const passwordLabel = passwordScore === 3 ? 'Strong password' : passwordScore === 2 ? 'Almost there' : 'Build a stronger password';

  const onSubmit = async (values: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser(values.name, values.email, values.password, values.confirmPassword);
      setRegisteredEmail(values.email);
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = () => {
    const firstInvalidField = Object.keys(form.formState.errors)[0] as keyof RegisterFormData | undefined;
    if (firstInvalidField) form.setFocus(firstInvalidField);
  };

  if (registeredEmail) {
    return (
      <Card className="border border-gray-200 shadow-sm rounded-xl bg-white text-center p-6 sm:p-8">
        <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5 text-emerald-600 border border-emerald-100">
          <Mail className="w-7 h-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
          Check your email
        </CardTitle>
        <CardDescription className="text-gray-600 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
          We&apos;ve sent a verification link to{' '}
          <span className="font-semibold text-gray-900">{registeredEmail}</span>.
          Please click the link in your email to verify your account and activate your bidding privileges.
        </CardDescription>

        <div className="space-y-3 pt-2">
          <Link href="/auth/login" className="w-full inline-block">
            <Button className="w-full h-10 bg-black text-white hover:bg-gray-800 font-medium rounded-lg transition-colors">
              Continue to Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-gray-400">
            Didn&apos;t receive the email? Check your spam folder or try signing in to resend.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50">
      <CardHeader className="space-y-4 border-b border-gray-100 px-6 pb-6 pt-7 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-50">1</span>
            Create your account
          </div>
          <span className="text-xs font-medium text-gray-400">Free forever</span>
        </div>
        <CardTitle className="text-3xl font-black tracking-tight text-gray-950">
          Create an Account
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-gray-500">
          Join a trusted community to discover auctions, bid live, and sell with confidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-7 pt-6 sm:px-8">
        <GoogleSignInButton />
        <div className="mb-5 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or create with email
          <span className="h-px flex-1 bg-gray-200" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input placeholder="e.g. Rahul Sharma" autoComplete="name" disabled={isLoading} className="h-11 rounded-xl border-gray-200 pl-10 focus-visible:border-indigo-500 focus-visible:ring-indigo-500" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Email address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input type="email" placeholder="name@example.com" autoComplete="email" disabled={isLoading} className="h-11 rounded-xl border-gray-200 pl-10 focus-visible:border-indigo-500 focus-visible:ring-indigo-500" {...field} />
                    </div>
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
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className="h-11 rounded-xl border-gray-200 pl-10 pr-10 focus-visible:border-indigo-500 focus-visible:ring-indigo-500"
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

            {/* Password requirements indicators */}
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Password strength</p>
                <span className={`text-xs font-semibold ${passwordScore === 3 ? 'text-emerald-600' : 'text-gray-500'}`}>{passwordLabel}</span>
              </div>
              <div className="flex gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${passwordScore >= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />)}
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                      hasMinLength
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className={hasMinLength ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                      hasUppercase
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className={hasUppercase ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    At least one uppercase letter (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                      hasNumber
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className={hasNumber ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    At least one number (0-9)
                  </span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className="h-11 rounded-xl border-gray-200 pl-10 pr-10 focus-visible:border-indigo-500 focus-visible:ring-indigo-500"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
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

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="space-y-1 pt-1">
                  <div className="flex items-start gap-2.5">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                        id="acceptTerms"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                      />
                    </FormControl>
                    <label
                      htmlFor="acceptTerms"
                      className="text-xs text-gray-600 leading-normal cursor-pointer select-none"
                    >
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        className="text-black font-medium underline underline-offset-2 hover:text-gray-800"
                        target="_blank"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        className="text-black font-medium underline underline-offset-2 hover:text-gray-800"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-gray-100 pt-5 pb-6">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-black hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
