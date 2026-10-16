'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Auction } from '@bidrush/shared';
import { AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { AuctionFilters } from '@/components/auction/AuctionFilters';
import { AuctionGrid } from '@/components/auction/AuctionGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface AuctionSearchResponse {
  auctions: Auction[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

function AuctionBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [searchText, setSearchText] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setSearchText(searchParams.get('q') || '');
  }, [searchParams]);

  const { data, error, isLoading, refetch } = useQuery<AuctionSearchResponse>({
    queryKey: ['auctions', queryString],
    queryFn: () => api.get<AuctionSearchResponse>(`/auctions${queryString ? `?${queryString}` : ''}`),
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = searchText.trim();
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Marketplace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">Explore auctions</h1>
          <p className="mt-2 text-gray-600">Search products and find your next great deal.</p>
        </header>

        <form onSubmit={submitSearch} className="mb-8 flex gap-2" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search products, brands, or descriptions"
              aria-label="Search auctions"
              maxLength={200}
              className="h-12 border-gray-300 bg-white pl-10"
            />
          </div>
          <Button type="submit" className="h-12 px-6">
            Search
          </Button>
        </form>

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <AuctionFilters />
          <section aria-live="polite" aria-busy={isLoading}>
            <div className="mb-4 flex min-h-6 items-center justify-between text-sm text-gray-500">
              <span>
                {data ? `${data.pagination.total} auction${data.pagination.total === 1 ? '' : 's'} found` : ''}
              </span>
              {data && totalPages > 0 && (
                <span>Page {data.pagination.page} of {totalPages}</span>
              )}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-white p-6 text-center" role="alert">
                <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-600" />
                <p className="font-semibold text-gray-900">Auctions could not be loaded.</p>
                <p className="mt-1 text-sm text-gray-600">
                  {error instanceof Error ? error.message : 'Please check your connection and try again.'}
                </p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <>
                <AuctionGrid auctions={data?.auctions} isLoading={isLoading} />
                {totalPages > 1 && (
                  <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Auction pages">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={page <= 1 || isLoading}
                      onClick={() => changePage(page - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      {data?.pagination.page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => changePage(page + 1)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-gray-500">Loading auctions…</div>}>
      <AuctionBrowser />
    </Suspense>
  );
}
