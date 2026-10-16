'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, Gavel, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSpecial?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/auctions', label: 'Explore', icon: Search },
  { href: '/sell', label: 'Sell', icon: Plus, isSpecial: true },
  { href: '/my-bids', label: 'My Bids', icon: Gavel },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] safe-area-bottom"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href)) ||
            (item.href === '/profile' && (pathname?.startsWith('/settings') || pathname?.startsWith('/dashboard')));

          if (item.isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 group"
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md',
                    isActive ? 'bg-black text-white' : 'bg-black text-white hover:scale-105'
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-medium text-gray-700 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
                isActive ? 'text-black font-semibold' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
