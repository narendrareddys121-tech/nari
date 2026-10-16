'use client';

import Link from 'next/link';
import { Gavel, PlusCircle, SearchX } from 'lucide-react';
import type { Auction } from '@bidrush/shared';
import { AuctionCard } from './AuctionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface AuctionGridProps {
  auctions?: Auction[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onWatchlistToggle?: (id: string, isWatchlisted: boolean) => void;
}

export function AuctionGrid({
  auctions = [],
  isLoading = false,
  emptyTitle = 'No auctions found',
  emptyDescription = 'Try adjusting your search terms or filters to find what you are looking for.',
  onWatchlistToggle,
}: AuctionGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            {/* Image Skeleton */}
            <Skeleton className="w-full aspect-[16/9] rounded-none" />

            {/* Content Skeleton */}
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>

              <div className="pt-3 border-t border-gray-100 mt-auto flex items-end justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-2xl text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 text-gray-400">
          <SearchX className="w-8 h-8 stroke-1 text-gray-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{emptyTitle}</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">{emptyDescription}</p>

        <div className="flex items-center gap-3">
          <Button asChild className="bg-black hover:bg-gray-800 text-white">
            <Link href="/sell">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create an Auction
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auctions">
              Browse All
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          onWatchlistToggle={onWatchlistToggle}
        />
      ))}
    </div>
  );
}
