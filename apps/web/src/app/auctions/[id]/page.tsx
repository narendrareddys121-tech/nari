'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, MapPin } from 'lucide-react';
import type { Auction } from '@bidrush/shared';
import { ImageGallery } from '@/components/auction/ImageGallery';
import { BidPanel } from '@/components/auction/BidPanel';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate, getConditionLabel } from '@/lib/utils';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: auction, error, isLoading, refetch } = useQuery<Auction>({
    queryKey: ['auction', id],
    queryFn: () => api.get<Auction>(`/auctions/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-gray-500">Loading auction…</div>;
  }

  if (error || !auction) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" role="alert">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />
        <h1 className="text-xl font-bold text-gray-900">Auction could not be loaded</h1>
        <p className="mt-2 text-sm text-gray-600">
          {error instanceof Error ? error.message : 'This auction may no longer be available.'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => void refetch()}>Try again</Button>
          <Button asChild>
            <Link href="/auctions">Browse auctions</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/auctions" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black">
          <ArrowLeft className="h-4 w-4" />
          Back to auctions
        </Link>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <ImageGallery images={auction.images} title={auction.title} />
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                {auction.category?.name && <span>{auction.category.name}</span>}
                <span>·</span>
                <span>{getConditionLabel(auction.condition)}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {auction.locationLocality}, {auction.locationCity}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-950">{auction.title}</h1>
              <p className="mt-4 whitespace-pre-wrap leading-7 text-gray-700">{auction.description}</p>
              <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
                {auction.host?.name && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Seller</dt>
                    <dd className="mt-1 font-medium text-gray-900">{auction.host.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Auction ends</dt>
                  <dd className="mt-1 font-medium text-gray-900">{formatDate(auction.endsAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
          <BidPanel auction={auction} />
        </div>
      </div>
    </div>
  );
}
