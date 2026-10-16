/**
 * BidRush Development Seed
 *
 * Creates sample data for local development and testing.
 * NEVER runs in production (enforced by NODE_ENV check).
 *
 * Creates:
 * - 8 product categories
 * - 3 test users (1 admin, 1 seller, 1 buyer)
 * - Sample auctions in various states
 *
 * Test accounts (for local dev only):
 * - admin@bidrush.dev / Admin@123456
 * - seller@bidrush.dev / Seller@123456
 * - buyer@bidrush.dev / Buyer@123456
 */

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seed must not run in production!');
    process.exit(1);
  }

  console.log('🌱 Seeding BidRush development database...');

  // ─── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, gadgets, and more', iconName: 'monitor' },
    { name: 'Furniture', slug: 'furniture', description: 'Home and office furniture', iconName: 'armchair' },
    { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories', iconName: 'shirt' },
    { name: 'Collectibles', slug: 'collectibles', description: 'Coins, stamps, vintage items', iconName: 'package' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Appliances, cookware, home decor', iconName: 'home' },
    { name: 'Sports & Fitness', slug: 'sports', description: 'Equipment, gear, and accessories', iconName: 'dumbbell' },
    { name: 'Books & Art', slug: 'books-art', description: 'Books, paintings, and art supplies', iconName: 'book-open' },
    { name: 'Vehicles', slug: 'vehicles', description: 'Cars, bikes, and accessories', iconName: 'car' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {},
    });
  }
  console.log('✅ Categories created');

  // ─── Test Users ────────────────────────────────────────────────────────────
  const hashOptions: argon2.Options = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 };

  const adminHash = await argon2.hash('Admin@123456', hashOptions);
  const sellerHash = await argon2.hash('Seller@123456', hashOptions);
  const buyerHash = await argon2.hash('Buyer@123456', hashOptions);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bidrush.dev' },
    create: {
      name: 'BidRush Admin',
      email: 'admin@bidrush.dev',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@bidrush.dev' },
    create: {
      name: 'Priya Sharma',
      email: 'seller@bidrush.dev',
      passwordHash: sellerHash,
      role: 'USER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@bidrush.dev' },
    create: {
      name: 'Rahul Verma',
      email: 'buyer@bidrush.dev',
      passwordHash: buyerHash,
      role: 'USER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  // Create profiles
  for (const [user, displayName, locality] of [
    [admin, 'BidRush Admin', 'MG Road'],
    [seller, 'Priya S.', 'Koramangala'],
    [buyer, 'Rahul V.', 'Indiranagar'],
  ] as const) {
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, displayName, city: 'Bengaluru', locality },
      update: {},
    });
    await prisma.sellerVerification.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: user.id === seller.id ? 'VERIFIED' : 'UNVERIFIED' },
      update: {},
    });
  }

  console.log('✅ Test users created:');
  console.log('   admin@bidrush.dev  / Admin@123456');
  console.log('   seller@bidrush.dev / Seller@123456');
  console.log('   buyer@bidrush.dev  / Buyer@123456');

  // ─── Sample Auctions ───────────────────────────────────────────────────────
  const electronics = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  const furniture = await prisma.category.findUnique({ where: { slug: 'furniture' } });

  if (electronics && furniture) {
    // Live auction
    await prisma.auction.upsert({
      where: { slug: 'macbook-pro-m3-2024-abcd1234' },
      create: {
        id: 'auction-macbook-001',
        hostId: seller.id,
        categoryId: electronics.id,
        title: 'MacBook Pro M3 2024',
        slug: 'macbook-pro-m3-2024-abcd1234',
        description: 'Excellent condition MacBook Pro M3, 14 inch, 16GB RAM, 512GB SSD. Purchased 6 months ago, includes original box and charger.',
        condition: 'LIKE_NEW',
        brand: 'Apple',
        model: 'MacBook Pro M3 14"',
        startingPricePaise: 8000000, // ₹80,000
        currentPricePaise: 8500000,  // ₹85,000 current bid
        minimumIncrementPaise: 100000, // ₹1,000
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // started 2 hours ago
        endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),   // ends in 4 hours
        status: 'LIVE',
        locationCity: 'Bengaluru',
        locationLocality: 'Koramangala',
        pickupAvailable: true,
        deliveryAvailable: false,
      },
      update: {},
    });

    // Scheduled auction
    await prisma.auction.upsert({
      where: { slug: 'vintage-wooden-bookshelf-efgh5678' },
      create: {
        id: 'auction-shelf-002',
        hostId: seller.id,
        categoryId: furniture.id,
        title: 'Vintage Wooden Bookshelf',
        slug: 'vintage-wooden-bookshelf-efgh5678',
        description: 'Beautiful vintage teak wood bookshelf, 6 feet tall, excellent condition. Perfect for home library or office.',
        condition: 'GOOD',
        startingPricePaise: 500000, // ₹5,000
        currentPricePaise: 500000,
        minimumIncrementPaise: 25000, // ₹250
        startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // starts in 2 hours
        endsAt: new Date(Date.now() + 26 * 60 * 60 * 1000),  // ends in 26 hours
        status: 'SCHEDULED',
        locationCity: 'Bengaluru',
        locationLocality: 'Indiranagar',
        pickupAvailable: true,
        deliveryAvailable: true,
      },
      update: {},
    });
  }

  console.log('✅ Sample auctions created');
  console.log('');
  console.log('🎉 Development seed complete!');
  console.log('');
  console.log('▶ Start the app: pnpm dev');
  console.log('▶ Open frontend: http://localhost:3000');
  console.log('▶ Open API health: http://localhost:4000/api/v1/health');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
