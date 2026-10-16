'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category } from '@bidrush/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const CONDITIONS = [
  { value: 'ALL', label: 'All Conditions' },
  { value: 'NEW', label: 'Brand New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'FOR_PARTS', label: 'For Parts' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'bids', label: 'Most Bids' },
];

const LOCALITIES = [
  'Indiranagar',
  'Koramangala',
  'Whitefield',
  'Electronic City',
  'Jayanagar',
  'JP Nagar',
  'Malleshwaram',
  'Rajajinagar',
  'Hebbal',
  'Yelahanka',
  'Bannerghatta Road',
  'HSR Layout',
  'BTM Layout',
  'Bellandur',
  'Marathahalli',
  'Sarjapur Road',
  'Silk Board',
  'Basavanagudi',
  'Shivajinagar',
  'MG Road',
  'Brigade Road',
  'Richmond Town',
  'Lavelle Road',
  'Cunningham Road',
  'Other',
];

interface AuctionFiltersProps {
  className?: string;
  isMobileModal?: boolean;
  onClose?: () => void;
}

export function AuctionFilters({ className, isMobileModal, onClose }: AuctionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isExpanded, setIsExpanded] = useState(false);

  // Read current filters from URL
  const selectedCategory = searchParams.get('category') || 'ALL';
  const selectedCondition = searchParams.get('condition') || 'ALL';
  const selectedLocality = searchParams.get('locality') || 'ALL';
  const selectedSort = searchParams.get('sortBy') || 'newest';
  const [minPrice, setMinPrice] = useState(searchParams.get('minPriceInr') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPriceInr') || '');

  // Fetch categories
  const {
    data: categories = [],
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return Array.isArray(res) ? res : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setMinPrice(searchParams.get('minPriceInr') || '');
    setMaxPrice(searchParams.get('maxPriceInr') || '');
  }, [searchParams]);

  const updateParam = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'ALL') {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      params.set('page', '1'); // Reset to first page
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice && Number(minPrice) > 0) {
      params.set('minPriceInr', minPrice);
    } else {
      params.delete('minPriceInr');
    }

    if (maxPrice && Number(maxPrice) > 0) {
      params.set('maxPriceInr', maxPrice);
    } else {
      params.delete('maxPriceInr');
    }

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams();
    const currentQ = searchParams.get('q');
    if (currentQ) params.set('q', currentQ);
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeFiltersCount = [
    selectedCategory !== 'ALL',
    selectedCondition !== 'ALL',
    selectedLocality !== 'ALL',
    Boolean(searchParams.get('minPriceInr')),
    Boolean(searchParams.get('maxPriceInr')),
    selectedSort !== 'newest',
  ].filter(Boolean).length;

  return (
    <div className={className}>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-black"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Body */}
      <div
        className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5 ${
          isExpanded ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black text-white">
                {activeFiltersCount}
              </span>
            )}
          </h3>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Sort By */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Sort By</Label>
          <Select
            value={selectedSort}
            onValueChange={(val) => updateParam('sortBy', val)}
          >
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Category</Label>
          <Select
            value={selectedCategory}
            onValueChange={(val) => updateParam('category', val)}
          >
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug} className="text-xs">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoriesError && (
            <p className="text-xs text-red-600" role="alert">
              Categories could not be loaded. Please try again.
            </p>
          )}
        </div>

        {/* Condition */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Condition</Label>
          <Select
            value={selectedCondition}
            onValueChange={(val) => updateParam('condition', val)}
          >
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue placeholder="All Conditions" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Locality (Bengaluru) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Bengaluru Locality</Label>
          <Select
            value={selectedLocality}
            onValueChange={(val) => updateParam('locality', val)}
          >
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue placeholder="All Bengaluru" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="ALL" className="text-xs">All Localities</SelectItem>
              {LOCALITIES.map((loc) => (
                <SelectItem key={loc} value={loc} className="text-xs">
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Price Range (₹)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 text-xs"
            />
            <span className="text-gray-400 text-xs">-</span>
            <Input
              type="number"
              placeholder="Max"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={applyPriceFilter}
            className="w-full text-xs h-8 border-gray-300 hover:border-black"
          >
            Apply Price
          </Button>
        </div>

        {isMobileModal && onClose && (
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
