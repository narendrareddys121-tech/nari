'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Gavel,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    exact: false,
  },
  {
    name: 'Auctions',
    href: '/admin/auctions',
    icon: Gavel,
    exact: false,
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingBag,
    exact: false,
  },
  {
    name: 'Finance',
    href: '/admin/finance',
    icon: DollarSign,
    exact: false,
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: AlertTriangle,
    exact: false,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm text-gray-500 font-medium">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AD';

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 antialiased">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar for Desktop & Mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-950 text-white transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-black text-sm">
              BR
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white leading-none">
                BidRush
              </span>
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider mt-0.5">
                Admin Panel
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1 text-gray-400 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-black' : 'text-gray-400 group-hover:text-white'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-black" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-800 p-4">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Go to Public Site</span>
          </Link>
          <div className="mt-4 flex items-center gap-3 px-1">
            <Avatar className="h-9 w-9 border border-gray-700 bg-gray-800">
              <AvatarImage src={user.profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gray-800 text-xs font-semibold text-gray-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden text-left">
              <span className="truncate text-xs font-semibold text-white">
                {user.name}
              </span>
              <span className="truncate text-[11px] text-gray-400">
                {user.email}
              </span>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-gray-900 sm:text-lg">
                Admin Panel
              </span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-800"
              >
                <ShieldCheck className="mr-1 h-3 w-3 text-emerald-600" />
                Verified Admin
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 text-xs">
                <span>View Storefront</span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 sm:border-l sm:border-gray-200 sm:pl-3">
              <Avatar className="h-8 w-8 border border-gray-200">
                <AvatarImage src={user.profile?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-gray-900 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-gray-900">{user.name}</span>
                <span className="text-[10px] text-gray-500 capitalize">{user.role.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
