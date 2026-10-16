import React from 'react';
import Link from 'next/link';
import { Gavel, ShieldCheck, Sparkles, TimerReset } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-200/25 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-lg p-1 text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black shadow-sm">
            <Gavel className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight">BidRush</span>
        </Link>

        <div className="my-auto grid items-start gap-10 py-10 lg:grid-cols-[1fr_440px] lg:gap-20 lg:pt-16">
          <section className="hidden max-w-xl pt-10 lg:block">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Bengaluru&apos;s live marketplace
            </div>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-gray-950">
              Your next great find
              <span className="text-indigo-600"> starts here.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-gray-600">
              Discover unique auctions, bid in real time, and sell to a community that values what you have.
            </p>
            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Secure', text: 'Protected accounts' },
                { icon: TimerReset, title: 'Live', text: 'Real-time bidding' },
                { icon: Gavel, title: 'Fair', text: 'Transparent auctions' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  <p className="mt-3 text-sm font-bold text-gray-900">{title}</p>
                  <p className="mt-1 text-xs text-gray-500">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs text-gray-500">
              <div className="flex -space-x-2">
                {['bg-indigo-200', 'bg-violet-200', 'bg-amber-200'].map((color) => (
                  <span key={color} className={`h-8 w-8 rounded-full border-2 border-[#f6f7fb] ${color}`} />
                ))}
              </div>
              <span>Made for curious bidders and trusted sellers.</span>
            </div>
          </section>
          <div className="w-full max-w-md justify-self-center lg:justify-self-end">
            {children}
          </div>
        </div>

        <footer className="pb-4 text-center text-xs text-gray-400 lg:text-left">
          <p>&copy; {new Date().getFullYear()} BidRush. Secure registration. Fair bidding.</p>
        </footer>
      </div>
    </div>
  );
}
