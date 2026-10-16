'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Gavel, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuctionImage } from '@bidrush/shared';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images?: AuctionImage[];
  title: string;
  className?: string;
}

export function ImageGallery({ images = [], title, className }: ImageGalleryProps) {
  // Sort images by sortOrder
  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // If no images exist
  if (!sortedImages || sortedImages.length === 0) {
    return (
      <div
        className={cn(
          'w-full aspect-[4/3] rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 shadow-sm',
          className
        )}
      >
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Gavel className="w-8 h-8 stroke-1 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">No images provided</p>
        <p className="text-xs text-gray-400 mt-1">The seller did not attach photos</p>
      </div>
    );
  }

  const currentImage = sortedImages[selectedIndex] || sortedImages[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={cn('space-y-4 select-none', className)}>
      {/* Main Image Display */}
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 shadow-sm group">
        <Image
          src={currentImage.imageUrl}
          alt={`${title} - view ${selectedIndex + 1}`}
          fill
          priority
          className="object-contain transition-all duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
        />

        {/* Carousel Prev/Next Buttons (only if multiple images) */}
        {sortedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image index indicator */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-medium backdrop-blur-sm">
            {selectedIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {sortedImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {sortedImages.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  'relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-gray-50 flex-shrink-0 transition-all duration-200 focus:outline-none',
                  isSelected
                    ? 'border-black ring-2 ring-black/20 shadow-sm'
                    : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                )}
                aria-label={`Select photo ${idx + 1}`}
              >
                <Image
                  src={img.imageUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
