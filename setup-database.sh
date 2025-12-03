#!/bin/bash

# 🚀 Database Setup Script for Streamline.ai MVP
# This script automates the database setup process

set -e  # Exit on error

echo "======================================"
echo "🗄️  Database Setup for Streamline.ai"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo ""
    echo "Please create .env.local file first:"
    echo "  1. Copy env.example: cp env.example .env.local"
    echo "  2. Fill in your Supabase credentials"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Found .env.local file"
echo ""

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=\"postgresql://postgres.xxxxx" .env.local; then
    echo "⚠️  Warning: DATABASE_URL still has placeholder values"
    echo ""
    echo "Please update .env.local with your actual Supabase credentials:"
    echo "  - DATABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "See DATABASE_SETUP_GUIDE.md for detailed instructions."
    echo ""
    read -p "Have you updated these values? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please update .env.local and run this script again."
        exit 1
    fi
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🔧 Step 2: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 3: Running database migrations..."
echo "This will create all tables in your Supabase database"
npx prisma migrate dev --name init

echo ""
echo "======================================"
echo "✅ Database setup complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Start the dev server: npm run dev"
echo "  2. Open Prisma Studio: npx prisma studio"
echo "  3. Visit http://localhost:3000"
echo "  4. Test signup at http://localhost:3000/signup"
echo ""
echo "📚 For troubleshooting, see DATABASE_SETUP_GUIDE.md"
echo ""


