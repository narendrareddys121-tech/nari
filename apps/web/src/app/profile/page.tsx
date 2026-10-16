'use client';

import Link from 'next/link';
import { RequireAuth } from '@/lib/auth-guard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Gavel, ShoppingBag, UserRound } from 'lucide-react';

function ProfileContent() {
  const { user, mode, setMode } = useAuth();
  const sellerStatus = user?.sellerStatus ?? 'UNVERIFIED';

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your account</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-950">Profile & marketplace</h1>
        <p className="mt-2 text-gray-600">One account for buying and selling. Switching views never changes your account or data.</p>
      </header>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link href="/auctions">Return to Marketplace</Link></Button>
          <Button type="button" onClick={() => setMode(mode === 'host' ? 'guest' : 'host')}>
            {mode === 'host' ? 'Switch to Guest Mode' : 'Become a Host'}
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Gavel className="mb-2 h-6 w-6" />
            <CardTitle>Host Dashboard</CardTitle>
            <CardDescription>Manage your listings, bids received, sales, commissions, and payouts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">Seller verification: <strong>{sellerStatus.replace('_', ' ')}</strong></p>
            {sellerStatus !== 'VERIFIED' && (
              <p className="text-sm text-gray-600">
                You can create drafts now. Publishing requires email verification and approval of your seller verification request.
              </p>
            )}
            <Button asChild><Link href="/dashboard">Open Host Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ShoppingBag className="mb-2 h-6 w-6" />
            <CardTitle>Guest Dashboard</CardTitle>
            <CardDescription>Keep track of your bids, watchlist, purchases, and delivery or pickup orders.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild><Link href="/my-bids">Open Guest Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link href="/auctions">Explore auctions</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <RequireAuth><ProfileContent /></RequireAuth>;
}
