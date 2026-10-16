'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/lib/auth-guard';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Gavel,
  TrendingUp,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const sidebarLinks = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/dashboard/auctions',
    label: 'My Auctions',
    icon: Gavel,
    exact: false,
  },
  {
    href: '/dashboard/sales',
    label: 'Sales & Earnings',
    icon: TrendingUp,
    exact: false,
  },
  {
    href: '/dashboard/payouts',
    label: 'Payouts',
    icon: CreditCard,
    exact: false,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <RequireAuth>
      <div className="min-h-[calc(100vh-4rem)] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header on mobile and desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Host Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage your auctions and sales. Your Guest activity remains on the same account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/my-bids" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-black">
                Switch to Guest
              </Link>
              <Link
                href="/dashboard/sell"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-sm self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                Create Auction
              </Link>
            </div>
          </div>

          {/* Mobile Top Tabs */}
          <div className="md:hidden mt-4 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-2 min-w-max">
              {sidebarLinks.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                      active
                        ? 'bg-black text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Content Layout */}
          <div className="mt-6 flex flex-col md:flex-row gap-8 items-start">
            {/* Desktop Left Sidebar */}
            <aside className="hidden md:block w-64 shrink-0 bg-white border border-gray-200 rounded-xl p-3 shadow-sm sticky top-24">
              <nav className="space-y-1">
                {sidebarLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all',
                        active
                          ? 'bg-black text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <Link
                  href="/dashboard/sell"
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Auction
                </Link>
              </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 w-full min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
