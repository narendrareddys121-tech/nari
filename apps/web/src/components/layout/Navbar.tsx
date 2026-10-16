'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Home,
  Compass,
  Gavel,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/auctions', label: 'Explore', icon: Compass },
  { href: '/sell', label: 'Sell', icon: Gavel },
  { href: '/my-bids', label: 'My Bids', icon: TrendingUp },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();

  // Hide navbar on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  const { user, isAuthenticated, logout, isLoading, mode, setMode } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 transition-shadow duration-200',
          isScrolled && 'shadow-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Gavel className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-black">
                BidRush
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <>
                      {/* Notifications */}
                      <Link
                        href="/notifications"
                        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        aria-label="Notifications"
                      >
                        <Bell className="w-5 h-5" />
                      </Link>

                      {/* Profile dropdown */}
                      <div className="relative">
                        <button
                          id="profile-menu-button"
                          onClick={() => setProfileOpen(!profileOpen)}
                          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-expanded={profileOpen}
                          aria-haspopup="menu"
                        >
                          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="hidden sm:block text-sm font-medium text-gray-800 max-w-[100px] truncate">
                            {user?.name?.split(' ')[0]}
                          </span>
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 text-gray-400 transition-transform',
                              profileOpen && 'rotate-180'
                            )}
                          />
                        </button>

                        {profileOpen && (
                          <div
                            className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                            role="menu"
                          >
                            <div className="px-4 py-3 border-b border-gray-100">
                              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <div className="p-1">
                              <button
                                type="button"
                                onClick={() => setMode(mode === 'host' ? 'guest' : 'host')}
                                className="mb-1 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100"
                                role="menuitem"
                              >
                                <span>{mode === 'host' ? 'Host Mode' : 'Guest Mode'}</span>
                                <span className="text-xs font-normal text-gray-500">Switch</span>
                              </button>
                              <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                role="menuitem"
                              >
                                <LayoutDashboard className="w-4 h-4" />
                                Host Dashboard
                              </Link>
                              <Link
                                href="/my-bids"
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                role="menuitem"
                              >
                                <TrendingUp className="w-4 h-4" />
                                Guest Dashboard
                              </Link>
                              <Link
                                href="/profile"
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                role="menuitem"
                              >
                                <User className="w-4 h-4" />
                                Profile
                              </Link>
                              <Link
                                href="/settings"
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                role="menuitem"
                              >
                                <Settings className="w-4 h-4" />
                                Settings
                              </Link>
                              {user?.role === 'ADMIN' && (
                                <Link
                                  href="/admin"
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                  role="menuitem"
                                >
                                  <LayoutDashboard className="w-4 h-4" />
                                  Admin Panel
                                </Link>
                              )}
                            </div>
                            <div className="p-1 border-t border-gray-100">
                              <button
                                id="logout-button"
                                onClick={logout}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                role="menuitem"
                              >
                                <LogOut className="w-4 h-4" />
                                Log out
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        href="/auth/login"
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* Mobile menu button */}
              <button
                id="mobile-menu-button"
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                      isActive ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-16" />

      {/* Overlay for profile dropdown */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileOpen(false)}
        />
      )}
    </>
  );
}
