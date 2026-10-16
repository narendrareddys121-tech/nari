'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Gavel } from 'lucide-react';
import type { Auction } from '@bidrush/shared';
import { cn, formatPrice, getConditionLabel, formatTimeLeft } from '@/lib/utils';
import { CountdownTimer } from './CountdownTimer';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface AuctionCardProps {
  auction: Auction;
  onWatchlistToggle?: (id: string, isWatchlisted: boolean) => void;
  className?: string;
}

export function AuctionCard({ auction, onWatchlistToggle, className }: AuctionCardProps) {
  const { isAuthenticated } = useAuth();
  const [isWatchlisted, setIsWatchlisted] = useState(auction.isWatchlisted ?? false);
  const [isToggling, setIsToggling] = useState(false);

  const primaryImage = auction.images?.[0]?.imageUrl;
  const isLive = auction.status === 'LIVE';
  const isScheduled = auction.status === 'SCHEDULED';
  const isEnded = ['ENDED', 'SOLD', 'UNSOLD', 'CANCELLED', 'AWAITING_PAYMENT'].includes(auction.status);

  // Check if ending soon (urgent)
  const timeLeft = isLive ? formatTimeLeft(auction.endsAt) : null;
  const isEndingSoon = isLive && (timeLeft?.isUrgent || false);

  async function toggleWatchlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || isToggling) return;

    setIsToggling(true);
    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);

    try {
      if (!nextState) {
        await api.delete(`/watchlist/${auction.id}`);
      } else {
        await api.post(`/watchlist/${auction.id}`, {});
      }
      onWatchlistToggle?.(auction.id, nextState);
    } catch {
      // Revert on failure
      setIsWatchlisted(!nextState);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className={cn('group block h-full select-none', className)}
    >
      <article className="h-full flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300">
        {/* Image Container with 16:9 Aspect Ratio */}
        <div className="relative aspect-[16/9] w-full bg-gray-50 overflow-hidden">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={auction.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
              <Gavel className="w-10 h-10 mb-1 stroke-1 text-gray-400" />
              <span className="text-xs">No image</span>
            </div>
          )}

          {/* Status Badge (Top-Left) */}
          <div className="absolute top-3 left-3 z-10">
            {isEndingSoon && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 shadow-sm backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Ending Soon
              </span>
            )}
            {!isEndingSoon && isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
            {isScheduled && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm backdrop-blur-sm">
                Upcoming
              </span>
            )}
            {isEnded && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 shadow-sm backdrop-blur-sm">
                Ended
              </span>
            )}
          </div>

          {/* Watchlist Button (Top-Right) */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={toggleWatchlist}
              disabled={isToggling}
              className={cn(
                'absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm',
                isWatchlisted
                  ? 'bg-black text-white hover:bg-black/90'
                  : 'bg-white/80 text-gray-600 hover:text-black hover:bg-white',
                isToggling && 'opacity-60 cursor-not-allowed'
              )}
              aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Heart
                className={cn('w-4 h-4 transition-colors', isWatchlisted && 'fill-current text-white')}
              />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            {/* Category & Condition */}
            <div className="flex items-center gap-2 mb-1.5">
              {auction.category?.name && (
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  {auction.category.name}
                </span>
              )}
              {auction.condition && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-[11px] font-medium text-gray-600">
                    {getConditionLabel(auction.condition)}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-black line-clamp-2 transition-colors">
              {auction.title}
            </h3>

            {/* Location */}
            {(auction.locationLocality || auction.locationCity) && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 truncate">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">
                  {[auction.locationLocality, auction.locationCity].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Price & Timing footer */}
          <div className="pt-2 border-t border-gray-100 mt-auto">
            <div className="flex items-baseline justify-between mb-1.5">
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase">
                  {auction.bidCount > 0 ? 'Current Bid' : 'Starting Bid'}
                </p>
                <p className="text-lg font-bold text-gray-900 tracking-tight">
                  {formatPrice(auction.currentPricePaise || auction.startingPricePaise)}
                </p>
              </div>

              {/* Time remaining or Start in */}
              <div className="text-right">
                <p className="text-[11px] font-medium text-gray-500 uppercase">
                  {isLive ? 'Ends In' : isScheduled ? 'Starts In' : 'Status'}
                </p>
                {isLive ? (
                  <CountdownTimer endsAt={auction.endsAt} size="sm" />
                ) : isScheduled ? (
                  <CountdownTimer endsAt={auction.startsAt} size="sm" />
                ) : (
                  <span className="text-xs font-semibold text-gray-500">
                    {auction.status === 'SOLD' ? 'Sold' : 'Closed'}
                  </span>
                )}
              </div>
            </div>

            {/* Total Bids */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}</span>
              <span className="text-xs font-medium text-gray-900 group-hover:underline">
                View Auction →
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
