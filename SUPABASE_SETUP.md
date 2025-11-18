# Supabase Setup Guide

Follow these steps to set up your Supabase database and storage for the Simplify MVP project.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `simplify-mvp` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is sufficient for MVP
5. Click **"Create new project"** and wait ~2 minutes for it to initialize

## Step 2: Get Your Database URL

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String** section
3. Select the **URI** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password you created in Step 1

## Step 3: Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public** key: Long string starting with `eyJ...`
   - Go to **Service Role** section (⚠️ keep this secret!)
   - **service_role** key: Another long string starting with `eyJ...`

## Step 4: Create Storage Bucket

1. In your Supabase project, go to **Storage**
2. Click **"New bucket"**
3. Name it: `resumes`
4. **Public bucket**: ✅ **NO** (keep it private)
5. Click **"Create bucket"**
6. Repeat to create another bucket named `encrypted-files`

## Step 5: Update Your .env File

Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

Then update the following variables in `.env.local`:

```env
# Database (from Step 2)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# Supabase (from Step 3)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Auth Secret (generate a new one)
AUTH_SECRET="your-secret-key-change-in-production"

# Google OAuth (Optional - only if you want Google login)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# LLM Provider (choose one - Groq is free and fast!)
GROQ_API_KEY="your_groq_api_key_here"
LLM_PROVIDER="groq"
LLM_MODEL="llama-3.1-8b-instant"
```

## Step 6: Run Database Migrations

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

## Step 7: Verify Setup

1. Check that tables were created:
   - Go to Supabase dashboard → **Table Editor**
   - You should see: `User`, `Account`, `Session`, `VerificationToken`, `Profile`, `Resume`, `Application`

2. Check storage buckets:
   - Go to **Storage**
   - You should see: `resumes` and `encrypted-files` buckets

## Step 8: Create a Test User (Optional)

You can create a test user via the signup page, or use Prisma Studio:

```bash
npx prisma studio
```

Then manually add a user to the `User` table.

## Troubleshooting

### Error: "Can't reach database server"
- Check your `DATABASE_URL` is correct
- Ensure your IP is allowed (Supabase allows all IPs by default on free tier)
- Verify the password in the connection string

### Error: "Invalid API key"
- Double-check you copied the correct keys from Supabase
- Ensure no extra spaces in `.env.local`
- Restart your dev server after updating `.env.local`

### Migration Errors
- If migrations fail, you can reset with:
  ```bash
  npx prisma migrate reset
  ```
  ⚠️ This will delete all data!

## Next Steps

After setup is complete:
1. Restart your dev server: `npm run dev`
2. Try signing up at: `http://localhost:3000/signup`
3. Test the profile and resume upload features
4. Check that data persists in Supabase dashboard

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)

