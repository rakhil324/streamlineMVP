# Team Setup Guide

## Quick Start for Team Members

### 1. Clone the Repository
```bash
git clone https://github.com/rakhil324/simplifyMVP.git
cd simplifyMVP
npm install
```

### 2. Get the `.env.local` File

**DO NOT commit credentials to git!** Get the `.env.local` file from a teammate via:
- Slack/Discord DM
- Email
- Shared password manager (1Password, LastPass, etc.)

The file should be placed at the root of the project: `simplifyMVP/.env.local`

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Start the Development Server
```bash
npm run dev
```

Open http://localhost:3000

---

## For the Team Lead: What to Share

Share this `.env.local` file privately (NOT via git):

```env
# ========================================
# SIMPLIFY MVP - Environment Variables
# ========================================

# Database (PostgreSQL via Supabase)
DATABASE_URL="postgresql://postgres.gszvqdgbkgzmqbmfuusc:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.gszvqdgbkgzmqbmfuusc.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://gszvqdgbkgzmqbmfuusc.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"

# NextAuth
AUTH_SECRET="[GENERATE_WITH: openssl rand -base64 32]"
NEXTAUTH_URL="http://localhost:3000"

# Encryption
ENCRYPTION_KEY="simplify-mvp-secure-key-32chars"

# LLM (Optional - for AI features)
# Get free key at: https://console.groq.com/keys
GROQ_API_KEY="[YOUR_GROQ_KEY]"
LLM_PROVIDER="groq"
LLM_MODEL="llama-3.1-8b-instant"
```

**Replace `[PASSWORD]`, `[ANON_KEY]`, `[SERVICE_ROLE_KEY]` with actual values from Supabase dashboard.**

---

## Supabase Dashboard Access

If teammates need direct database access:
- **Project URL**: https://supabase.com/dashboard/project/gszvqdgbkgzmqbmfuusc
- Ask the project owner to invite you as a team member

---

## Troubleshooting

### "prepared statement already exists" error
Make sure your `DATABASE_URL` ends with `?pgbouncer=true`

### "Unauthorized" or "Session expired"
Clear browser cookies and log in again

### Prisma errors
```bash
npx prisma generate
npx prisma db push
```

### Database not synced
```bash
npx prisma db push
```

