import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Gavel, Shield, Zap, TrendingUp, CheckCircle, MapPin, Laptop, Sofa, Shirt, Trophy, House, Dumbbell } from 'lucide-react';

export const metadata: Metadata = {
  title: 'BidRush — Bid Fast. Win Big.',
  description: 'Bengaluru\'s premier live auction marketplace. Find unique items, place real-time bids, and win amazing deals.',
};

const features = [
  {
    icon: Zap,
    title: 'Live Bidding',
    description: 'Real-time bids powered by Socket.IO. See every bid as it happens — never miss a moment.',
  },
  {
    icon: Shield,
    title: 'Secure & Trusted',
    description: 'Verified sellers, secure payments through Razorpay, and 7% transparent platform fee.',
  },
  {
    icon: TrendingUp,
    title: 'Earn More, Sell Smarter',
    description: 'Let the market decide. Competitive bidding often drives prices above expectations.',
  },
];

const categories = [
  { name: 'Electronics', icon: Laptop, slug: 'electronics' },
  { name: 'Furniture', icon: Sofa, slug: 'furniture' },
  { name: 'Fashion', icon: Shirt, slug: 'fashion' },
  { name: 'Collectibles', icon: Trophy, slug: 'collectibles' },
  { name: 'Home & Kitchen', icon: House, slug: 'home-kitchen' },
  { name: 'Sports', icon: Dumbbell, slug: 'sports' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative bg-black text-white overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <MapPin className="w-3.5 h-3.5 text-gray-300" />
            <span>Now live in Bengaluru</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none tracking-tight mb-6">
            Bid Fast.
            <br />
            <span className="text-gray-400">Win Big.</span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed">
            BidRush is Bengaluru's live auction marketplace. Discover unique products,
            compete in real-time bidding, and score incredible deals.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auctions"
              id="hero-explore-cta"
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-colors"
            >
              Explore Auctions
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sell"
              id="hero-sell-cta"
              className="inline-flex items-center justify-center gap-2 bg-transparent text-white border-2 border-white/30 font-bold px-8 py-4 rounded-xl text-lg hover:border-white hover:bg-white/10 transition-colors"
            >
              <Gavel className="w-5 h-5" />
              Start Selling
            </Link>
          </div>

        </div>
      </section>

      {/* ─── Categories ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Browse Categories</h2>
            <p className="text-gray-500 mt-1">Find what you're looking for</p>
          </div>
          <Link href="/auctions" className="text-sm font-semibold text-black hover:underline">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/auctions?category=${cat.slug}`}
              id={`category-${cat.slug}`}
              className="group flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-xl hover:border-black hover:shadow-md transition-all duration-200"
            >
              <cat.icon className="w-7 h-7 text-gray-700" aria-hidden="true" />
              <span className="text-sm font-semibold text-gray-800 group-hover:text-black text-center">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 mb-3">
              Why BidRush?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Built for Bengaluru. Designed for everyone. A marketplace where prices are set by real demand.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-black text-gray-900 text-center mb-14">How It Works</h2>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* For buyers */}
          <div>
            <div className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded-full mb-6">
              For Buyers
            </div>
            <div className="space-y-6">
              {[
                { step: '01', title: 'Browse Auctions', desc: 'Discover live and upcoming auctions across all categories.' },
                { step: '02', title: 'Place Your Bid', desc: 'Bid in real-time. Get instant updates when you\'re outbid.' },
                { step: '03', title: 'Win & Pay', desc: 'Win the auction, complete payment securely, and collect your item.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="text-2xl font-black text-gray-200 w-10 flex-shrink-0">{item.step}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For sellers */}
          <div>
            <div className="inline-block bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full mb-6">
              For Sellers
            </div>
            <div className="space-y-6">
              {[
                { step: '01', title: 'List Your Item', desc: 'Create a listing with photos, set your starting bid and duration.' },
                { step: '02', title: 'Go Live', desc: 'Your auction goes live. Buyers compete to win your item.' },
                { step: '03', title: 'Get Paid', desc: 'Receive your proceeds minus the 7% platform fee after buyer payment.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="text-2xl font-black text-gray-200 w-10 flex-shrink-0">{item.step}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Fee Transparency ─────────────────────────────────────────────── */}
      <section className="bg-black text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-6 text-white" />
          <h2 className="text-3xl font-black mb-4">Transparent Pricing</h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            BidRush charges a simple 7% platform fee on successful sales. No hidden fees, no surprises.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { sale: '₹1,000', fee: '₹70', net: '₹930' },
              { sale: '₹5,000', fee: '₹350', net: '₹4,650' },
              { sale: '₹10,000', fee: '₹700', net: '₹9,300' },
              { sale: '₹25,000', fee: '₹1,750', net: '₹23,250' },
            ].map((row) => (
              <div key={row.sale} className="bg-white/10 rounded-xl p-4">
                <p className="text-lg font-black">{row.sale}</p>
                <p className="text-xs text-gray-400 mt-1">Sale price</p>
                <div className="border-t border-white/20 my-3" />
                <p className="text-sm text-gray-300">Fee: <span className="font-semibold">{row.fee}</span></p>
                <p className="text-sm text-white font-semibold mt-1">You get: {row.net}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Ready to start?</h2>
        <p className="text-gray-500 text-lg mb-8">Join thousands of buyers and sellers in Bengaluru.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            id="cta-register"
            className="inline-flex items-center justify-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-900 transition-colors"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/auctions"
            className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-bold px-8 py-4 rounded-xl text-lg hover:border-black hover:text-black transition-colors"
          >
            Browse Auctions
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Gavel className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-black">BidRush</span>
              </div>
              <p className="text-sm text-gray-400">Bid Fast. Win Big. Bengaluru's live auction marketplace.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Marketplace</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/auctions" className="hover:text-black">Browse Auctions</Link></li>
                <li><Link href="/sell" className="hover:text-black">Sell an Item</Link></li>
                <li><Link href="/how-it-works" className="hover:text-black">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/help" className="hover:text-black">Help Center</Link></li>
                <li><Link href="/rules" className="hover:text-black">Auction Rules</Link></li>
                <li><Link href="/contact" className="hover:text-black">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/terms" className="hover:text-black">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-black">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">© 2024 BidRush. All rights reserved.</p>
            <p className="text-sm text-gray-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Bengaluru, Karnataka, India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
