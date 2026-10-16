'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  Gavel,
  History,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import type { Auction, Bid } from '@bidrush/shared';
import { inrToPaise, formatInr } from '@bidrush/shared';
import { cn, formatPrice, formatDate, formatTimeLeft } from '@/lib/utils';
import { CountdownTimer } from './CountdownTimer';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface BidPanelProps {
  auction: Auction;
  className?: string;
  onBidSuccess?: () => void;
}

// Obscure bidder name for privacy (e.g. "Rahul" -> "R***l")
function obscureName(name?: string | null): string {
  if (!name || name.trim().length === 0) return 'Bidder ***';
  const clean = name.trim();
  if (clean.length <= 2) return `${clean[0]}***`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
}

export function BidPanel({ auction, className, onBidSuccess }: BidPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Watchlist state
  const [isWatchlisted, setIsWatchlisted] = useState(auction.isWatchlisted ?? false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  // Status checks
  const isLive = auction.status === 'LIVE';
  const isScheduled = auction.status === 'SCHEDULED';
  const isEnded = ['ENDED', 'SOLD', 'UNSOLD', 'CANCELLED', 'AWAITING_PAYMENT'].includes(auction.status);
  const isHost = user?.id === auction.hostId;

  // Calculate minimum next bid
  const currentPricePaise = auction.currentPricePaise || auction.startingPricePaise;
  const minIncrementPaise = auction.minimumIncrementPaise || 10000; // default ₹100
  const minNextBidPaise =
    auction.bidCount === 0
      ? auction.startingPricePaise
      : currentPricePaise + minIncrementPaise;
  const minNextBidInr = Math.ceil(minNextBidPaise / 100);

  // Bid input state (in INR)
  const [bidAmountInr, setBidAmountInr] = useState<string>(minNextBidInr.toString());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch bid history
  const { data: bids = [], isLoading: isLoadingBids } = useQuery<Bid[]>({
    queryKey: ['auction-bids', auction.id],
    queryFn: async () => {
      try {
        const res = await api.get<Bid[]>(`/auctions/${auction.id}/bids`);
        return Array.isArray(res) ? res : (res as any)?.data ?? [];
      } catch {
        return [];
      }
    },
    refetchInterval: isLive ? 3000 : false, // Poll every 3 seconds while live
  });

  // Watchlist mutation
  const toggleWatchlist = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/auctions/${auction.id}`);
      return;
    }
    if (isTogglingWatchlist) return;

    setIsTogglingWatchlist(true);
    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);

    try {
      if (!nextState) {
        await api.delete(`/watchlist/${auction.id}`);
      } else {
        await api.post(`/watchlist/${auction.id}`, {});
      }
      queryClient.invalidateQueries({ queryKey: ['auction', auction.id] });
    } catch {
      setIsWatchlisted(!nextState);
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  // Place bid mutation
  const placeBidMutation = useMutation({
    mutationFn: async (amountInr: number) => {
      const amountPaise = inrToPaise(amountInr);
      const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      return api.post(`/auctions/${auction.id}/bids`, {
        amountPaise,
        requestId,
      });
    },
    onSuccess: () => {
      setSuccessMessage('Bid placed successfully!');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['auction', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', auction.id] });
      onBidSuccess?.();
      // Set next suggested bid
      const newMin = (Number(bidAmountInr) || minNextBidInr) + Math.ceil(minIncrementPaise / 100);
      setBidAmountInr(newMin.toString());
    },
    onError: (err: any) => {
      setSuccessMessage(null);
      setErrorMessage(err.message || 'Failed to place bid. Please try again.');
    },
  });

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isAuthenticated) {
      router.push(`/login?redirect=/auctions/${auction.id}`);
      return;
    }

    if (isHost) {
      setErrorMessage('You cannot bid on your own auction.');
      return;
    }

    const numericAmount = Number(bidAmountInr);
    if (isNaN(numericAmount) || numericAmount < minNextBidInr) {
      setErrorMessage(`Your bid must be at least ${formatPrice(minNextBidPaise)}`);
      return;
    }

    placeBidMutation.mutate(numericAmount);
  };

  const handleQuickBid = (incrementInr: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const base = Math.max(Number(bidAmountInr) || 0, minNextBidInr);
    setBidAmountInr((base + incrementInr).toString());
  };

  return (
    <Card className={cn('bg-white border-gray-200 shadow-sm sticky top-20', className)}>
      <CardContent className="p-6 space-y-6">
        {/* Header: Status & Watchlist Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AUCTION LIVE
              </span>
            )}
            {isScheduled && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                SCHEDULED
              </span>
            )}
            {isEnded && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                {auction.status === 'SOLD' ? 'SOLD' : 'AUCTION ENDED'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleWatchlist}
            disabled={isTogglingWatchlist}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              isWatchlisted
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:border-black'
            )}
            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Heart className={cn('w-3.5 h-3.5', isWatchlisted && 'fill-current text-white')} />
            <span>{isWatchlisted ? 'Watchlisted' : 'Watchlist'}</span>
          </button>
        </div>

        {/* Countdown Timer */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            {isLive ? 'Time Remaining' : isScheduled ? 'Starts In' : 'Auction Finished'}
          </p>
          {isLive && <CountdownTimer endsAt={auction.endsAt} size="lg" />}
          {isScheduled && <CountdownTimer endsAt={auction.startsAt} size="lg" />}
          {isEnded && (
            <p className="text-lg font-bold text-gray-700">
              Closed on {formatDate(auction.endsAt)}
            </p>
          )}
        </div>

        {/* Current Bid & Pricing Details */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {auction.bidCount > 0 ? 'Current Highest Bid' : 'Starting Bid'}
            </span>
            <span className="text-xs text-gray-500">
              {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'} total
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatPrice(currentPricePaise)}
            </p>
          </div>

          {isLive && (
            <p className="text-xs text-gray-600 mt-1">
              Minimum next bid:{' '}
              <span className="font-semibold text-gray-900">
                {formatPrice(minNextBidPaise)}
              </span>
            </p>
          )}
        </div>

        {/* Bidding Form or Status Notice */}
        {isLive && !isHost && (
          <form onSubmit={handlePlaceBid} className="space-y-4 pt-2 border-t border-gray-100">
            {/* Quick Bid Increment Buttons */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Quick Add</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickBid(100)}
                  className="border-gray-200 hover:border-black text-xs font-semibold"
                >
                  +₹100
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickBid(500)}
                  className="border-gray-200 hover:border-black text-xs font-semibold"
                >
                  +₹500
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickBid(1000)}
                  className="border-gray-200 hover:border-black text-xs font-semibold"
                >
                  +₹1,000
                </Button>
              </div>
            </div>

            {/* Custom Bid Input */}
            <div className="space-y-1.5">
              <label htmlFor="bidInput" className="text-xs font-medium text-gray-700">
                Your Maximum Bid (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                  ₹
                </span>
                <Input
                  id="bidInput"
                  type="number"
                  min={minNextBidInr}
                  step={1}
                  value={bidAmountInr}
                  onChange={(e) => setBidAmountInr(e.target.value)}
                  className="pl-8 text-base font-semibold border-gray-300 focus-visible:ring-black"
                  required
                />
              </div>
            </div>

            {/* Error or Success notification */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700 animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700 animate-in fade-in-50">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Place Bid Button */}
            <Button
              type="submit"
              disabled={placeBidMutation.isPending}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white font-bold text-base shadow-sm rounded-xl"
            >
              {placeBidMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Bid...
                </>
              ) : (
                <>
                  <Gavel className="w-5 h-5 mr-2" />
                  Place Bid for ₹{Number(bidAmountInr || 0).toLocaleString('en-IN')}
                </>
              )}
            </Button>

            {!isAuthenticated && (
              <p className="text-center text-xs text-gray-500">
                You will be asked to{' '}
                <Link href={`/login?redirect=/auctions/${auction.id}`} className="underline font-semibold text-black">
                  sign in
                </Link>{' '}
                to confirm your bid.
              </p>
            )}
          </form>
        )}

        {isHost && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <ShieldCheck className="w-6 h-6 text-gray-500 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-gray-800">You are the seller</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sellers are not permitted to bid on their own listings.
            </p>
          </div>
        )}

        {isEnded && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <Lock className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
            <p className="text-sm font-semibold text-gray-900">
              {auction.status === 'SOLD' ? 'Item has been Sold' : 'This auction has concluded'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Final price: {formatPrice(currentPricePaise)}
            </p>
          </div>
        )}

        {/* Bid History Section */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-gray-500" />
              Bid History
            </h4>
            <span className="text-xs text-gray-500">
              {bids.length} entries
            </span>
          </div>

          {isLoadingBids ? (
            <div className="py-6 flex justify-center items-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : bids.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 italic">
              No bids placed yet. Be the first!
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {bids.map((b, index) => {
                const isLeading = index === 0;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors',
                      isLeading
                        ? 'bg-emerald-50/70 border border-emerald-200/60 font-medium'
                        : 'bg-gray-50 border border-gray-100'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">
                          {obscureName(b.bidder?.profile?.displayName || b.bidder?.name)}
                        </span>
                        {isLeading && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-600 text-white font-semibold">
                            Highest
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(b.createdAt)}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">
                      {formatPrice(b.amountPaise)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-around text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Escrow Protected</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-gray-600" />
            <span>Verified Bids</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
