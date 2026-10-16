'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { Auction, Bid, Order } from '@bidrush/shared';
import { AlertCircle, Gavel, ShoppingBag } from 'lucide-react';
import { RequireAuth } from '@/lib/auth-guard';
import { api } from '@/lib/api';
import { AuctionGrid } from '@/components/auction/AuctionGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

type BidWithAuction = Bid & { auction: Auction };

function GuestDashboard() {
  const bidsQuery = useQuery<BidWithAuction[]>({
    queryKey: ['my-bids'],
    queryFn: () => api.get<BidWithAuction[]>('/users/me/bids'),
  });
  const ordersQuery = useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.get<Order[]>('/orders'),
  });
  const watchlistQuery = useQuery<Array<{ auction: Auction }>>({
    queryKey: ['my-watchlist'],
    queryFn: () => api.get<Array<{ auction: Auction }>>('/watchlist'),
  });

  const auctions = Array.from(new Map(
    (bidsQuery.data ?? []).filter((bid) => bid.auction).map((bid) => [bid.auction.id, bid.auction])
  ).values());
  const isLoading = bidsQuery.isLoading || ordersQuery.isLoading || watchlistQuery.isLoading;
  const error = bidsQuery.error || ordersQuery.error || watchlistQuery.error;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Guest Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Your bidding activity</h1>
          <p className="mt-2 text-gray-600">Your Host listings and Guest purchases stay connected to this same account.</p>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard">Switch to Host</Link></Button>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Could not load some account activity. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5" />Your bids</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bidsQuery.data?.length ? bidsQuery.data.slice(0, 5).map((bid) => (
              <Link key={bid.id} href={`/auctions/${bid.auctionId}`} className="flex justify-between gap-3 rounded-lg border border-gray-100 p-3 hover:border-gray-300">
                <span className="truncate font-medium">{bid.auction?.title ?? 'Auction'}</span>
                <span className="shrink-0 text-sm">{formatPrice(bid.amountPaise)}</span>
              </Link>
            )) : !bidsQuery.isLoading && (
              <div className="py-3 text-sm text-gray-600">Discover auctions and place your first bid.</div>
            )}
            <Button asChild variant="outline"><Link href="/auctions">Explore auctions</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" />Orders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ordersQuery.data?.length ? ordersQuery.data.map((order) => (
              <div key={order.id} className="flex justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <span className="truncate font-medium">{order.auction?.title ?? 'Auction order'}</span>
                <span className="shrink-0 text-sm">{order.status.replaceAll('_', ' ')}</span>
              </div>
            )) : !ordersQuery.isLoading && <p className="py-3 text-sm text-gray-600">Your purchases will appear here after you win an auction.</p>}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Watchlist</h2>
        <AuctionGrid
          auctions={(watchlistQuery.data ?? []).map((item) => item.auction).filter(Boolean)}
          isLoading={isLoading}
          emptyTitle="Your watchlist is empty"
          emptyDescription="Save auctions you're interested in and they will be here."
        />
      </section>
    </div>
  );
}

export default function MyBidsPage() {
  return <RequireAuth><GuestDashboard /></RequireAuth>;
}
