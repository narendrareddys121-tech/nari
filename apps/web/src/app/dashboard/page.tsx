'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Auction, Order } from '@bidrush/shared';
import { AlertCircle, ArrowRight, CheckCircle2, Gavel, PlusCircle, Video } from 'lucide-react';
import { RequireAuth } from '@/lib/auth-guard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

type HostAuction = Auction & {
  _count?: { bids: number };
  bids?: Array<{ amountPaise: number; bidderId: string; createdAt: string }>;
};

interface Earnings {
  completedOrders: Array<{ id: string; winningBidPaise: number; commissionPaise: number; sellerProceedsPaise: number; status: string; createdAt: string }>;
  pendingOrdersCount: number;
  totalGrossSalesPaise: number;
  totalCommissionPaidPaise: number;
  totalSellerProceedsPaise: number;
}

function HostDashboard() {
  const queryClient = useQueryClient();
  const { setMode } = useAuth();
  const [actionError, setActionError] = useState('');
  const [pendingAuction, setPendingAuction] = useState<string | null>(null);
  const auctionsQuery = useQuery<HostAuction[]>({
    queryKey: ['host-auctions'],
    queryFn: () => api.get<HostAuction[]>('/users/me/auctions'),
  });
  const ordersQuery = useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.get<Order[]>('/orders'),
  });
  const earningsQuery = useQuery<Earnings>({
    queryKey: ['seller-earnings'],
    queryFn: () => api.get<Earnings>('/seller/earnings'),
  });
  const payoutsQuery = useQuery<Array<{ id: string; status: string; amountPaise: number }>>({
    queryKey: ['seller-payouts'],
    queryFn: () => api.get('/seller/payouts'),
  });
  const auctions = auctionsQuery.data ?? [];
  const orders = (ordersQuery.data ?? []).filter((order) => order.sellerId);
  const drafts = auctions.filter((auction) => auction.status === 'DRAFT');
  const active = auctions.filter((auction) => ['LIVE', 'SCHEDULED', 'PENDING_REVIEW'].includes(auction.status));
  const completed = auctions.filter((auction) => ['SOLD', 'AWAITING_PAYMENT', 'ENDED'].includes(auction.status));
  const unsold = auctions.filter((auction) => ['UNSOLD', 'CANCELLED'].includes(auction.status));
  const ordersAwaitingPayment = orders.filter((order) => order.status === 'AWAITING_PAYMENT').length;
  const busy = auctionsQuery.isLoading || ordersQuery.isLoading || earningsQuery.isLoading || payoutsQuery.isLoading;
  const fetchError = auctionsQuery.error || ordersQuery.error || earningsQuery.error || payoutsQuery.error;

  async function publishAuction(auctionId: string) {
    setActionError('');
    setPendingAuction(auctionId);
    try {
      await api.post(`/auctions/${auctionId}/publish`, {});
      await queryClient.invalidateQueries({ queryKey: ['host-auctions'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not publish this auction.');
    } finally {
      setPendingAuction(null);
    }
  }

  async function cancelAuction(auctionId: string) {
    setActionError('');
    setPendingAuction(auctionId);
    try {
      await api.post(`/auctions/${auctionId}/cancel`, {});
      await queryClient.invalidateQueries({ queryKey: ['host-auctions'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not cancel this auction.');
    } finally {
      setPendingAuction(null);
    }
  }

  const auctionSection = (title: string, items: HostAuction[], emptyText: string, canPublish = false) => (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title} <span className="text-sm font-normal text-gray-500">({items.length})</span></h3>
        {title === 'Draft auctions' && <Link className="text-sm font-medium underline" href="/dashboard/sell">Create auction</Link>}
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {items.map((auction) => (
            <Card key={auction.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link href={`/auctions/${auction.id}`} className="font-semibold text-gray-900 hover:underline">{auction.title}</Link>
                  <p className="mt-1 text-sm text-gray-500">
                    {auction.status.replaceAll('_', ' ')} · {auction._count?.bids ?? auction.bidCount ?? 0} bids ·
                    {' '}Highest {formatPrice(auction.bids?.[0]?.amountPaise ?? auction.currentPricePaise)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPublish && (
                    <Button type="button" size="sm" disabled={pendingAuction === auction.id} onClick={() => void publishAuction(auction.id)}>
                      {pendingAuction === auction.id ? 'Publishing…' : 'Publish'}
                    </Button>
                  )}
                  {['LIVE', 'SCHEDULED', 'DRAFT'].includes(auction.status) && (
                    <Button type="button" variant="outline" size="sm" disabled={pendingAuction === auction.id} onClick={() => void cancelAuction(auction.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Host Dashboard</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">Your auctions and sales</h2>
          <p className="mt-2 text-sm text-gray-600">Buying and selling share one account. Your bids and orders remain available in Guest Dashboard.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" onClick={() => setMode('guest')}><Link href="/my-bids">Switch to Guest</Link></Button>
          <Button asChild><Link href="/dashboard/sell"><PlusCircle className="mr-2 h-4 w-4" />Create auction</Link></Button>
        </div>
      </header>

      {fetchError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {fetchError instanceof Error ? fetchError.message : 'Some dashboard information could not be loaded.'}
        </div>
      )}
      {actionError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{actionError}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Active auctions', active.length],
          ['Draft auctions', drafts.length],
          ['Orders awaiting payment', earningsQuery.data?.pendingOrdersCount ?? ordersAwaitingPayment],
          ['Completed sales', earningsQuery.data?.completedOrders.length ?? 0],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold">{busy ? '—' : value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardDescription>Gross completed sales</CardDescription><CardTitle>{formatPrice(earningsQuery.data?.totalGrossSalesPaise ?? 0)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>7% platform commission</CardDescription><CardTitle>{formatPrice(earningsQuery.data?.totalCommissionPaidPaise ?? 0)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Seller proceeds</CardDescription><CardTitle>{formatPrice(earningsQuery.data?.totalSellerProceedsPaise ?? 0)}</CardTitle></CardHeader></Card>
      </div>

      {payoutsQuery.data && payoutsQuery.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payout status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payoutsQuery.data.map((payout) => (
              <div key={payout.id} className="flex justify-between rounded-lg border border-gray-100 p-3 text-sm">
                <span>{formatPrice(payout.amountPaise)}</span><span>{payout.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {auctionSection('Draft auctions', drafts, 'Have something to sell? Create your first auction.', true)}
      {auctionSection('Active auctions', active, 'Your live and scheduled auctions will appear here.')}
      {auctionSection('Completed auctions', completed, 'Completed auctions and sales will appear here.')}
      {auctionSection('Unsold auctions', unsold, 'Auctions that did not sell will appear here.')}

      <Card className="overflow-hidden">
        <CardHeader>
          <Video className="mb-2 h-5 w-5" />
          <CardTitle>BidRush in action</CardTitle>
          <CardDescription>Your product showcase video, available right here in the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <video className="aspect-video w-full rounded-xl bg-black" controls playsInline preload="metadata" aria-label="BidRush product showcase">
            <source src="/videos/Making_video_colorful_with_products_20261015150425.mp4" type="video/mp4" />
            Your browser does not support embedded video.
          </video>
          <Button asChild variant="outline" className="mt-4"><Link href="/auctions">Return to Marketplace <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return <RequireAuth><HostDashboard /></RequireAuth>;
}
