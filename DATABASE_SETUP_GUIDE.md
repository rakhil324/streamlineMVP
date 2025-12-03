# 🗄️ PostgreSQL + Supabase Setup Guide

Complete guide to setting up your production-ready database backend with PostgreSQL and Supabase.

---

## 📋 What You'll Set Up

- ✅ **PostgreSQL Database** (via Supabase) - Production-ready cloud database
- ✅ **File Storage** (via Supabase Storage) - Encrypted file storage for resumes
- ✅ **Authentication** (NextAuth with Prisma) - User authentication with database sessions
- ✅ **API Routes** - Complete REST API for your application

---

## 🚀 Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with GitHub (recommended) or email

### 1.2 Create New Project

1. Click **"New Project"** button
2. Fill in the project details:
   - **Name**: `streamline-ai-mvp` (or your preferred name)
   - **Database Password**: Generate a strong password
     - ⚠️ **IMPORTANT**: Save this password somewhere safe! You'll need it.
   - **Region**: Choose the region closest to you (or your users)
   - **Pricing Plan**: Select **"Free"** tier (perfect for MVP)
3. Click **"Create new project"**
4. Wait ~2 minutes for Supabase to provision your database

---

## 🔑 Step 2: Get Your Database Credentials

### 2.1 Get Database Connection String

1. In your Supabase dashboard, go to **Settings** (gear icon in sidebar)
2. Click **"Database"** in the left menu
3. Scroll down to **"Connection string"** section
4. Select the **"URI"** tab (not Transaction or Session)
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
6. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the database password you created in Step 1.2

### 2.2 Get API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these three values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: Long string starting with `eyJ...`
   - Scroll down to **service_role** section
   - **service_role** key: Another long string starting with `eyJ...`
     - ⚠️ **Keep this secret!** Never commit this to GitHub or expose it publicly

---

## 📦 Step 3: Create Storage Buckets

### 3.1 Create Resumes Bucket

1. In Supabase dashboard, click **"Storage"** in the left sidebar
2. Click **"Create a new bucket"**
3. Configure the bucket:
   - **Name**: `resumes`
   - **Public bucket**: ❌ **UNCHECK** (keep it private for security)
   - **Allowed MIME types**: Leave empty (we'll handle validation in code)
   - **File size limit**: 50 MB (or adjust as needed)
4. Click **"Create bucket"**

### 3.2 Set Storage Permissions (Important!)

1. Click on the `resumes` bucket you just created
2. Click **"Policies"** tab
3. Click **"New Policy"**
4. Choose **"For full customization"**
5. Configure the policy:
   - **Policy name**: `Authenticated users can upload`
   - **Allowed operation**: SELECT **All**
   - **Policy definition**: Use this SQL:
   ```sql
   (bucket_id = 'resumes'::text) AND (auth.role() = 'authenticated'::text)
   ```
6. Click **"Review"** → **"Save policy"**

This ensures only authenticated users can access files in the resumes bucket.

---

## ⚙️ Step 4: Configure Environment Variables

### 4.1 Copy Environment Template

In your project terminal, run:

```bash
cp env.example .env.local
```

### 4.2 Update .env.local

Open `.env.local` and update with your Supabase credentials:

```env
# ========================================
# DATABASE (PostgreSQL via Supabase)
# ========================================
DATABASE_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# ========================================
# NEXTAUTH CONFIGURATION
# ========================================
AUTH_SECRET="generate-a-secure-random-string-here-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"

# ========================================
# SUPABASE CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ========================================
# LLM PROVIDER (Choose one)
# ========================================
# Option 1: Groq (FREE & FAST - Recommended)
GROQ_API_KEY="your_groq_api_key_here"
LLM_PROVIDER="groq"
LLM_MODEL="llama-3.1-8b-instant"

# Option 2: OpenAI (Paid)
# OPENAI_API_KEY="sk-..."
# LLM_PROVIDER="openai"
# LLM_MODEL="gpt-4o"

# Option 3: Google Gemini (FREE)
# GEMINI_API_KEY="your_gemini_api_key_here"
# LLM_PROVIDER="gemini"
# LLM_MODEL="gemini-pro"

# ========================================
# GOOGLE OAUTH (Optional)
# ========================================
# Uncomment if you want Google Sign-In
# GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
# GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# ========================================
# ENCRYPTION (Optional - auto-generated)
# ========================================
ENCRYPTION_KEY=""
```

### 4.3 Generate AUTH_SECRET

Generate a secure random string for `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

### 4.4 Get LLM API Key (Required for AI Features)

**Recommended: Groq (Free & Fast)**

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up with Google or GitHub
3. Click **"API Keys"** in the left sidebar
4. Click **"Create API Key"**
5. Copy the key and paste it into `.env.local` as `GROQ_API_KEY`

**Alternative: Google Gemini (Also Free)**

1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the key and update `.env.local` with Gemini settings

---

## 📦 Step 5: Install Dependencies

Make sure all dependencies are installed:

```bash
npm install
```

This will install:
- `@prisma/client` - Database ORM
- `prisma` - Database toolkit
- `@supabase/supabase-js` - Supabase client
- `next-auth` - Authentication
- `@auth/prisma-adapter` - NextAuth + Prisma integration
- `bcryptjs` - Password hashing
- `zod` - Validation

---

## 🗄️ Step 6: Set Up Database Schema

### 6.1 Generate Prisma Client

```bash
npx prisma generate
```

This reads your `prisma/schema.prisma` and generates the Prisma Client.

### 6.2 Create Database Tables

Run the migration to create all tables in your Supabase database:

```bash
npx prisma migrate dev --name init
```

This will create:
- ✅ `User` - User accounts
- ✅ `Account` - OAuth connections
- ✅ `Session` - User sessions
- ✅ `VerificationToken` - Email verification
- ✅ `Profile` - Encrypted user profiles
- ✅ `Resume` - Resume metadata & versions
- ✅ `Application` - Job application tracking

### 6.3 Verify Tables Were Created

1. Go to Supabase dashboard
2. Click **"Table Editor"** in the left sidebar
3. You should see all 7 tables listed above

---

## ✅ Step 7: Test Your Setup

### 7.1 Open Prisma Studio

Prisma Studio is a GUI for viewing and editing your database:

```bash
npx prisma studio
```

This opens `http://localhost:5555` where you can:
- View all your tables
- See the schema
- Manually add/edit data
- Test queries

### 7.2 Start Development Server

```bash
npm run dev
```

Your app should start at `http://localhost:3000`

### 7.3 Test User Sign-Up

1. Go to `http://localhost:3000/signup`
2. Create a new account with:
   - Email
   - Name
   - Password (min 6 characters)
3. Click **"Sign Up"**
4. If successful, you should be redirected to the dashboard

### 7.4 Verify Database Entry

1. Go back to Prisma Studio (`http://localhost:5555`)
2. Click on **"User"** table
3. You should see your newly created user!

---

## 🎯 Step 8: Test Complete Workflow

### Test Profile Creation
1. Navigate to `/profile` page
2. Fill in your profile information
3. Save - data should be encrypted and stored

### Test Resume Upload
1. Navigate to `/ai-tools` page
2. Upload a resume file (PDF, DOCX, or TXT)
3. Check Supabase dashboard → Storage → resumes bucket
4. You should see your encrypted file

### Test Application Tracking
1. Navigate to `/tracker` page
2. Add a new job application
3. Check Prisma Studio → Application table
4. You should see your application saved

---

## 🔍 Troubleshooting

### "Can't reach database server"
- ✅ Check your `DATABASE_URL` is correct
- ✅ Verify the password has no typos
- ✅ Make sure you're using the **Pooler** connection string (port 6543)
- ✅ Check your internet connection

### "Invalid API key"
- ✅ Double-check you copied the full key (they're very long)
- ✅ Ensure no extra spaces or line breaks
- ✅ Verify you're using the **anon** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Verify you're using the **service_role** key for `SUPABASE_SERVICE_ROLE_KEY`

### "Bucket not found"
- ✅ Go to Supabase → Storage
- ✅ Verify bucket is named exactly `resumes` (lowercase)
- ✅ Check bucket permissions are set correctly

### "Permission denied" on file upload
- ✅ Check storage bucket policies (Step 3.2)
- ✅ Ensure user is authenticated
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Migration Errors
If migrations fail, you can reset and try again:

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
```

⚠️ **Warning**: This deletes all data! Only use in development.

---

## 📊 Database Schema Overview

```
┌─────────────────────────────────────────────────┐
│                    User                         │
│  - id, email, name, password                    │
│  - emailVerified, image                         │
│  - createdAt, updatedAt                         │
└────────────┬────────────────────────────────────┘
             │
             ├──────────────┬──────────────────┬──────────────┐
             │              │                  │              │
    ┌────────▼─────┐  ┌────▼──────┐  ┌────────▼────────┐   │
    │   Profile    │  │  Resume   │  │  Application    │   │
    │  (encrypted) │  │ (metadata)│  │  (job tracker)  │   │
    └──────────────┘  └────┬──────┘  └─────────────────┘   │
                           │                                │
                           └────────────────────────────────┘
                           (Applications link to Resumes)

    ┌────────────────┬────────────────┬──────────────────┐
    │    Account     │    Session     │ VerificationToken│
    │  (OAuth data)  │ (user sessions)│  (email verify)  │
    └────────────────┴────────────────┴──────────────────┘
             (NextAuth Tables)
```

---

## 🎉 Success Checklist

Your setup is complete when:

- ✅ Supabase project is created and running
- ✅ `.env.local` file is configured with all credentials
- ✅ Database tables are created (visible in Supabase Table Editor)
- ✅ Storage bucket `resumes` is created with proper permissions
- ✅ Prisma Studio shows your database schema
- ✅ You can create a user account via `/signup`
- ✅ User appears in database (check Prisma Studio)
- ✅ Dev server runs without errors

---

## 🚢 Ready for Production?

When deploying to production (Vercel, Netlify, etc.):

1. **Environment Variables**: Add all `.env.local` variables to your hosting platform
2. **Database**: Supabase is already production-ready!
3. **Run Migrations**: Use `npx prisma migrate deploy` (not `dev`)
4. **Update NEXTAUTH_URL**: Set to your production domain
5. **Secure AUTH_SECRET**: Generate a new secret for production

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Review your `.env.local` for typos
3. Check Supabase dashboard for error logs
4. Run `npm run dev` and check terminal for errors

---

**🎊 Congratulations!** Your database backend is now production-ready!

You can now build your application features knowing your data is:
- ✅ Secure (encrypted where needed)
- ✅ Scalable (PostgreSQL can handle millions of records)
- ✅ Backed up (Supabase handles this automatically)
- ✅ Production-ready (works on any hosting platform)


