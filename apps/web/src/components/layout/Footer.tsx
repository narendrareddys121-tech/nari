import Link from 'next/link';
import { Gavel } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Brand & Tagline */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                <Gavel className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-black">
                BidRush
              </span>
            </Link>
            <p className="text-xs text-gray-500 mt-1">
              Bengaluru&apos;s live auction marketplace. Bid fast, win big.
            </p>
          </div>

          {/* Center: Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <Link href="/about" className="hover:text-black transition-colors">
              About
            </Link>
            <Link href="/terms" className="hover:text-black transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Privacy
            </Link>
            <Link href="/help" className="hover:text-black transition-colors">
              Help
            </Link>
            <Link href="/rules" className="hover:text-black transition-colors">
              Rules
            </Link>
          </div>

          {/* Right: City Badge & Copyright */}
          <div className="flex flex-col items-center md:items-end gap-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 font-medium text-gray-700">
              Made in Bengaluru 🇮🇳
            </span>
            <span>&copy; {currentYear} BidRush Inc. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
